using AgenticServer.Data;
using AgenticServer.Models;
using AgenticServer.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/messages")]
    [AllowAnonymous]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessagesController(ApplicationDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetMessages(
            Guid roomId,
            [FromQuery] DateTime? before,
            [FromQuery] int pageSize = 20)
        {
            if (roomId == Guid.Empty)
                return BadRequest("Invalid roomId");

            var query = _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.RoomId == roomId);

            if (before != null)
            {
                query = query.Where(m => m.Timestamp < before);
            }

            var messages = await query
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

            var sender = await _context.Users.FindAsync(message.SenderId);

            var messageDto = new
            {
                id = message.Id,
                roomId = message.RoomId,
                senderId = message.SenderId,
                senderName = sender?.Username ?? "Unknown",
                content = message.Content,
                timestamp = message.Timestamp
            };

            await _hubContext
                .Clients
                .Group(message.RoomId.ToString())
                .SendAsync("ReceiveMessage", messageDto);

            return Ok(messageDto);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] Guid roomId,
            [FromQuery] DateTime before)
        {
            if (roomId == Guid.Empty)
                return BadRequest("Invalid roomId");

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.RoomId == roomId && m.Timestamp < before)
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
