using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;

namespace AgenticServer.Controllers
{
    public class LoginRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("password")]
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("password")]
        public string Password { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;
        private readonly PasswordHasher<User> _passwordHasher;

        public AuthController(ApplicationDbContext db, IConfiguration config, ILogger<AuthController> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
            _passwordHasher = new PasswordHasher<User>();
        }

        [Authorize]
        [HttpGet("/api/users/search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                return Ok(new List<object>());

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var q = query.Trim().ToLower();

            var users = await _db.Users
                .Where(u =>
                    (u.Username.ToLower().Contains(q) ||
                     u.Email.ToLower().Contains(q)) &&
                    u.Id.ToString() != currentUserId
                )
                .OrderBy(u => u.Username)
                .Take(10)
                .Select(u => new
                {
                    id = u.Id,
                    username = u.Username,
                    email = u.Email
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest input)
        {
            if (string.IsNullOrEmpty(input.Email))
            {
                return BadRequest("Email is required");
            }

            if (string.IsNullOrWhiteSpace(input.Password))
            {
                return BadRequest("Password is required");
            }

            var normalizedEmail = input.Email.Trim().ToLower();

            _logger.LogInformation("Register request received for email: {Email}", normalizedEmail);

            if (!normalizedEmail.Contains("@"))
            {
                return BadRequest("Invalid email");
            }

            var baseUsername = input.Username;

            if (string.IsNullOrWhiteSpace(baseUsername))
            {
                baseUsername = normalizedEmail.Split("@")[0];
            }

            baseUsername = baseUsername.Trim().ToLower();

            var username = baseUsername;

            var random = new Random();

            while (await _db.Users.AnyAsync(x => x.Username == username))
            {
                username = $"{baseUsername}_{random.Next(100, 999)}";
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = normalizedEmail,
                CreatedAt = DateTime.UtcNow
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, input.Password);

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            _logger.LogInformation("User registered successfully: {Email} -> Username: {Username}", normalizedEmail, username);

            return Ok();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest input)
        {
            if (string.IsNullOrWhiteSpace(input.Email) || string.IsNullOrWhiteSpace(input.Password))
            {
                _logger.LogWarning("Login failed due to empty email or password");
                return Unauthorized();
            }

            var normalizedEmail = input.Email.Trim().ToLower();

            _logger.LogInformation("Attempting login for: {Email}", normalizedEmail);

            var user = await _db.Users.FirstOrDefaultAsync(
                x => x.Email == normalizedEmail
            );

            if (user == null)
            {
                _logger.LogWarning("User not found: {Email}", normalizedEmail);
                return Unauthorized();
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, input.Password);
            var isPasswordValid = result == PasswordVerificationResult.Success;

            _logger.LogInformation(
                "Login attempt for {Email}. Password matches: {Result}",
                normalizedEmail,
                isPasswordValid
            );

            if (!isPasswordValid)
            {
                return Unauthorized();
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "dev_secret_key_123456789"));

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            _logger.LogInformation("Login successful for user: {Email}", normalizedEmail);

            return Ok(new { token = jwt });
        }

        [Authorize]
        [HttpDelete("/api/account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userIdClaim == null)
                return Unauthorized();

            var userId = Guid.Parse(userIdClaim);

            await using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);

                if (user == null)
                    return NotFound();

                var userRooms = await _db.Rooms
                    .Where(r => r.OwnerId == userId)
                    .ToListAsync();

                var roomIds = userRooms.Select(r => r.Id).ToList();

                var messagesToDelete = await _db.Messages
                    .Where(m => roomIds.Contains(m.RoomId))
                    .ToListAsync();

                var messageIds = messagesToDelete.Select(m => m.Id).ToList();

                var attachmentsToDelete = await _db.Attachments
                    .Where(a => messageIds.Contains(a.MessageId))
                    .ToListAsync();

                var memberships = await _db.RoomMembers
                    .Where(m => roomIds.Contains(m.RoomId))
                    .ToListAsync();

                _db.Attachments.RemoveRange(attachmentsToDelete);
                _db.Messages.RemoveRange(messagesToDelete);
                _db.RoomMembers.RemoveRange(memberships);
                _db.Rooms.RemoveRange(userRooms);

                var userMemberships = await _db.RoomMembers
                    .Where(m => m.UserId == userId)
                    .ToListAsync();

                _db.RoomMembers.RemoveRange(userMemberships);

                _db.Users.Remove(user);

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                _logger.LogInformation("User account deleted: {UserId}", userId);

                return Ok();
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Account deletion failed for {UserId}", userId);
                return StatusCode(500, "Account deletion failed");
            }
        }
    }
}
