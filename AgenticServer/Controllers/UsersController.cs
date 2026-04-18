using AgenticServer.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return Ok(new List<object>());

            var users = await _context.Users
                .Where(u => u.Username.Contains(query))
                .OrderBy(u => u.Username)
                .Take(10)
                .Select(u => new
                {
                    u.Id,
                    u.Username
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
