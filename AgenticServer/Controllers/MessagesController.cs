using AgenticServer.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/rooms")]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("{roomId}/messages")]
        public async Task<IActionResult> GetMessages(
            Guid roomId,
            [FromQuery] DateTime? before,
            [FromQuery] int limit = 20)
        {
            var cursor = before ?? DateTime.UtcNow;

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
