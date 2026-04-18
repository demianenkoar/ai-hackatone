using AgenticServer.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChannelsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChannelsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid CurrentUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(id!);
        }

        [HttpGet]
        public async Task<IActionResult> GetChannels()
        {
            var userId = CurrentUserId();

            var channels = await _context.Rooms
                .Where(r => r.IsPublic || r.Members.Any(m => m.UserId == userId))
                .OrderBy(r => r.Name)
                .Select(r => new
                {
                    Id = r.Id,
                    Title = r.Name,
                    r.IsPublic
                })
                .ToListAsync();

            return Ok(channels);
        }
    }
}
