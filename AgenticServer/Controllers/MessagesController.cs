using AgenticServer.Data;
using AgenticServer.Models;
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
            [FromQuery] int pageSize = 20)
        {
            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.RoomId == roomId && (before == null || m.Timestamp < before))
                .OrderByDescending(m => m.Timestamp)
                .Take(pageSize)
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

        [HttpPost]
        public async Task<IActionResult> PostMessage([FromBody] Message input)
        {
            if (input.RoomId == Guid.Empty)
                return BadRequest("RoomId must be a valid GUID");

            var roomExists = await _context.Rooms.AnyAsync(r => r.Id == input.RoomId);
            if (!roomExists)
                return BadRequest("Room does not exist");

            var message = new Message
            {
                Id = Guid.NewGuid(),
                RoomId = input.RoomId,
                SenderId = input.SenderId,
                Content = input.Content,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = message.Id,
                roomId = message.RoomId,
                senderId = message.SenderId,
                content = message.Content,
                timestamp = message.Timestamp
            });
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

            messages.Reverse();

            return Ok(messages);
        }
    }
}
