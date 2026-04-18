using Microsoft.AspNetCore.Mvc;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class ChannelsController : ControllerBase {
    private readonly ApplicationDbContext _context;
    public ChannelsController(ApplicationDbContext context) => _context = context;

    [HttpGet] public async Task<ActionResult<IEnumerable<Channel>>> Get() => await _context.Channels.ToListAsync();

    [HttpPost] public async Task<ActionResult<Channel>> Post(Channel channel) {
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();
        return Ok(channel);
    }
}
