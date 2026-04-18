using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using Microsoft.Extensions.Logging;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;

        public AuthController(ApplicationDbContext db, IConfiguration config, ILogger<AuthController> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] User input)
        {
            if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.PasswordHash))
            {
                _logger.LogWarning("Registration failed due to empty username or password");
                return BadRequest("Username and password are required");
            }

            if (await _db.Users.AnyAsync(x => x.Username == input.Username))
            {
                _logger.LogWarning("Registration attempt with existing username: {Username}", input.Username);
                return BadRequest("Username already exists");
            }

            input.Id = Guid.NewGuid();
            input.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.PasswordHash);
            input.CreatedAt = DateTime.UtcNow;

            _db.Users.Add(input);
            await _db.SaveChangesAsync();

            _logger.LogInformation("User registered successfully: {Username}", input.Username);

            return Ok();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] User input)
        {
            if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.PasswordHash))
            {
                _logger.LogWarning("Login failed due to empty username or password");
                return Unauthorized();
            }

            _logger.LogInformation("Attempting login for: {Username}", input.Username);

            var user = await _db.Users.FirstOrDefaultAsync(x => x.Username == input.Username);

            if (user == null)
            {
                _logger.LogWarning("User not found: {Username}", input.Username);
                return Unauthorized();
            }

            var passwordValid = BCrypt.Net.BCrypt.Verify(input.PasswordHash, user.PasswordHash);

            if (!passwordValid)
            {
                _logger.LogWarning("Invalid password for user: {Username}", input.Username);
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

            _logger.LogInformation("Login successful for user: {Username}", user.Username);

            return Ok(new { token = jwt });
        }
    }
}
