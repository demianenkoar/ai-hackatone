using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;

namespace AgenticServer.Controllers
{
    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest input)
        {
            if (string.IsNullOrWhiteSpace(input.Email) || string.IsNullOrWhiteSpace(input.Password))
            {
                _logger.LogWarning("Registration failed due to empty email or password");
                return BadRequest("Email and password are required");
            }

            var normalizedEmail = input.Email.Trim().ToLower();

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

            while (await _db.Users.AnyAsync(x => x.Username.ToLower() == username))
            {
                username = $"{baseUsername}_{random.Next(100, 999)}";
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
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

            var user = await _db.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == normalizedEmail || x.Username.ToLower().StartsWith(normalizedEmail.Split("@")[0]));

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
    }
}
