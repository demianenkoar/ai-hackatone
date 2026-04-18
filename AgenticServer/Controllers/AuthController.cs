using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;

        public AuthController(ApplicationDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] User input)
        {
            if (await _db.Users.AnyAsync(x => x.Username == input.Username))
                return BadRequest("Username already exists");

            input.Id = Guid.NewGuid();
            input.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.PasswordHash);
            input.CreatedAt = DateTime.UtcNow;

            _db.Users.Add(input);
            await _db.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] User input)
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.Username == input.Username);

            if (user == null)
                return Unauthorized();

            var passwordValid = BCrypt.Net.BCrypt.Verify(input.PasswordHash, user.PasswordHash);

            if (!passwordValid)
                return Unauthorized();

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

            return Ok(new { token = jwt });
        }
    }
}
