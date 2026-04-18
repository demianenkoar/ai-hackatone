using AgenticServer.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/messages")]
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
            [FromQuery] DateTime? before,
            [FromQuery] int limit = 20)
        {
            var cursor = before ?? DateTime.UtcNow;

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.RoomId == roomId && m.Timestamp < cursor)
                .OrderByDescending(m => m.Timestamp)
                .Take(limit)
                .Select(m => new
                {
                    id = m.Id,
                    roomId = m.RoomId,
                    senderId = m.SenderId,
                    senderName = m.Sender != null ? m.Sender.Username : "Unknown",
                    content = m.Content,
                    timestamp = m.Timestamp
                })
                .ToListAsync();

            messages.Reverse();

            return Ok(messages);
        }

        [HttpGet("paged/{roomId}")]
        public async Task<IActionResult> GetPaged(Guid roomId, [FromQuery] DateTime? ts)
        {
            var cursor = ts ?? DateTime.UtcNow;

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.RoomId == roomId && m.Timestamp < cursor)
                .OrderByDescending(m => m.Timestamp)
                .Take(20)
                .Select(m => new
                {
                    id = m.Id,
                    roomId = m.RoomId,
                    senderId = m.SenderId,
                    senderName = m.Sender != null ? m.Sender.Username : "Unknown",
                    content = m.Content,
                    timestamp = m.Timestamp
                })
                .ToListAsync();

            return Ok(messages);
        }
    }
}
