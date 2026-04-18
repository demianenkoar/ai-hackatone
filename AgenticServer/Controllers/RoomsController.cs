using AgenticServer.Data;
using AgenticServer.Hubs;
using AgenticServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoomsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hub;

        public RoomsController(ApplicationDbContext context, IHubContext<ChatHub> hub)
        {
            _context = context;
            _hub = hub;
        }

        private Guid CurrentUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(id!);
        }

        [HttpGet]
        public async Task<IActionResult> GetRooms()
        {
            var userId = CurrentUserId();

            var rooms = await _context.Rooms
                .Where(r => r.IsPublic || r.Members.Any(m => m.UserId == userId))
                .OrderBy(r => r.Name)
                .Select(r => new
                {
                    r.Id,
                    r.Name,
                    r.IsPublic
                })
                .ToListAsync();

            return Ok(rooms);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRoom([FromBody] Room input)
        {
            var userId = CurrentUserId();

            var room = new Room
            {
                Id = Guid.NewGuid(),
                Name = input.Name,
                Description = input.Description,
                IsPublic = input.IsPublic,
                IsPrivate = !input.IsPublic,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Rooms.Add(room);

            _context.RoomMembers.Add(new RoomMember
            {
                RoomId = room.Id,
                UserId = userId,
                Role = RoomRole.Owner
            });

            await _context.SaveChangesAsync();

            return Ok(room);
        }

        [HttpPost("add-user")]
        public async Task<IActionResult> AddUserToRoom(string roomId, string userId)
        {
            if (!Guid.TryParse(roomId, out Guid parsedRoomId))
                return BadRequest("Invalid roomId");

            if (!Guid.TryParse(userId, out Guid parsedUserId))
                return BadRequest("Invalid userId");

            var exists = await _context.RoomMembers
                .AnyAsync(m => m.RoomId == parsedRoomId && m.UserId == parsedUserId);

            if (!exists)
            {
                _context.RoomMembers.Add(new RoomMember
                {
                    RoomId = parsedRoomId,
                    UserId = parsedUserId,
                    Role = RoomRole.Member
                });

                await _context.SaveChangesAsync();
            }

            await _hub.Clients.User(parsedUserId.ToString())
                .SendAsync("RoomAdded", parsedRoomId.ToString());

            return Ok();
        }
    }
}
