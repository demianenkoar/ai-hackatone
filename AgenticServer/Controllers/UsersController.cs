using AgenticServer.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

        [HttpDelete("/api/account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var claimId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(claimId))
                return Unauthorized();

            var userId = Guid.Parse(claimId);

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound();

            var messages = _context.Messages.Where(m => m.SenderId == userId);
            _context.Messages.RemoveRange(messages);

            var memberships = _context.RoomMembers.Where(rm => rm.UserId == userId);
            _context.RoomMembers.RemoveRange(memberships);

            await _context.SaveChangesAsync();

            _context.Users.Remove(user);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
