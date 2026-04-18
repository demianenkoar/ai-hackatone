using AgenticServer.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return Ok(new List<object>());

            var q = query.Trim().ToLower();

            var users = await _context.Users
                .Where(u =>
                    u.Username.ToLower().Contains(q) ||
                    u.Email.ToLower().Contains(q))
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
    }
}
