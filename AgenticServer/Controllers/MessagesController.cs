using AgenticServer.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetMessages(
            Guid roomId,
            [FromQuery] Guid userId,
            [FromQuery] DateTime? beforeTimestamp,
            [FromQuery] int limit = 20)
        {
            var membership = await _context.RoomMembers
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

            if (membership != null && membership.IsBanned)
            {
                return Forbid();
            }

            var cursor = beforeTimestamp ?? DateTime.UtcNow;

            var messages = await _context.Messages
                .Where(m => m.RoomId == roomId && m.Timestamp < cursor)
                .OrderByDescending(m => m.Timestamp)
                .Take(limit)
                .ToListAsync();

            var ordered = messages
                .OrderBy(m => m.Timestamp)
                .ToList();

            return Ok(ordered);
        }
    }
}
