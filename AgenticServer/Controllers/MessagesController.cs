using AgenticServer.Data;
using AgenticServer.Models;
using AgenticServer.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/messages")]
    [AllowAnonymous]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IWebHostEnvironment _env;

        public MessagesController(ApplicationDbContext context, IHubContext<ChatHub> hubContext, IWebHostEnvironment env)
        {
            _context = context;
            _hubContext = hubContext;
            _env = env;
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
                .Include(m => m.ReplyToMessage)
                .ThenInclude(r => r.Sender)
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
                    timestamp = m.Timestamp,
                    isDeleted = m.IsDeleted,
                    replyToMessageId = m.ReplyToMessageId,
                    replyTo = m.ReplyToMessage == null ? null : new
                    {
                        id = m.ReplyToMessage.Id,
                        senderName = m.ReplyToMessage.Sender != null ? m.ReplyToMessage.Sender.Username : "Unknown",
                        content = m.ReplyToMessage.Content
                    }
                })
                .ToListAsync();

            messages.Reverse();

            return Ok(messages);
        }

        [HttpGet("{roomId}/search")]
        public async Task<IActionResult> SearchMessages(Guid roomId, [FromQuery] string q)
        {
            if (roomId == Guid.Empty)
                return BadRequest("Invalid roomId");

            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<object>());

            var query = q.Trim().ToLower();

            var results = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.ReplyToMessage)
                .ThenInclude(r => r.Sender)
                .Where(m =>
                    m.RoomId == roomId &&
                    m.Content.ToLower().Contains(query) &&
                    !m.Content.StartsWith("/uploads/")
                )
                .OrderByDescending(m => m.Timestamp)
                .Take(50)
                .Select(m => new
                {
                    id = m.Id,
                    roomId = m.RoomId,
                    senderId = m.SenderId,
                    senderName = m.Sender != null ? m.Sender.Username : "Unknown",
                    content = m.Content,
                    timestamp = m.Timestamp,
                    isDeleted = m.IsDeleted,
                    replyToMessageId = m.ReplyToMessageId,
                    replyTo = m.ReplyToMessage == null ? null : new
                    {
                        id = m.ReplyToMessage.Id,
                        senderName = m.ReplyToMessage.Sender != null ? m.ReplyToMessage.Sender.Username : "Unknown",
                        content = m.ReplyToMessage.Content
                    }
                })
                .ToListAsync();

            results.Reverse();

            return Ok(results);
        }

        [Authorize]
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(Guid messageId)
        {
            var claimId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimId))
                return Unauthorized();

            var userId = Guid.Parse(claimId);

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return NotFound();

            if (message.SenderId != userId)
                return Forbid();

            message.IsDeleted = true;

            await _context.SaveChangesAsync();

            await _hubContext.Clients
                .Group(message.RoomId.ToString())
                .SendAsync("MessageDeleted", new
                {
                    id = message.Id
                });

            return NoContent();
        }

        [HttpGet("{roomId}/files")]
        public async Task<IActionResult> GetRoomFiles(Guid roomId)
        {
            if (roomId == Guid.Empty)
                return BadRequest("Invalid roomId");

            var files = await _context.Messages
                .Where(m => m.RoomId == roomId && m.Content.StartsWith("/uploads/"))
                .Include(m => m.Sender)
                .OrderByDescending(m => m.Timestamp)
                .Select(m => new
                {
                    id = m.Id,
                    url = m.Content,
                    senderName = m.Sender != null ? m.Sender.Username : "Unknown",
                    timestamp = m.Timestamp,
                    fileName = m.Content.Substring(m.Content.LastIndexOf('_') + 1)
                })
                .ToListAsync();

            return Ok(files);
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

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/{fileName}";

            return Ok(new { url = fileUrl });
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
