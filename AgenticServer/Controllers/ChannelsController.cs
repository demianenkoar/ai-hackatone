using AgenticServer.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChannelsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChannelsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetChannels()
        {
            var channels = await _context.Rooms
                .Where(r => !r.IsPrivate)
                .OrderBy(r => r.Name)
                .Select(r => new
                {
                    Id = r.Id,
                    Title = r.Name
                })
                .ToListAsync();

            return Ok(channels);
        }
    }
}
