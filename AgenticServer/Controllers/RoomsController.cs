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
                    r.IsPublic,
                    r.IsPrivate
                })
                .ToListAsync();

            return Ok(rooms);
        }

        [HttpGet("{roomId}/members")]
        public async Task<IActionResult> GetMembers(Guid roomId)
        {
            var members = await _context.RoomMembers
                .Where(m => m.RoomId == roomId)
                .Include(m => m.User)
                .Select(m => new
                {
                    userId = m.UserId,
                    username = m.User.Username,
                    m.Role
                })
                .ToListAsync();

            return Ok(members);
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

        [HttpPost("{roomId}/add-user/{userId}")]
        public async Task<IActionResult> AddUserToRoom(Guid roomId, Guid userId)
        {
            var exists = await _context.RoomMembers
                .AnyAsync(m => m.RoomId == roomId && m.UserId == userId);

            if (exists)
            {
                return BadRequest("User is already a member of this room.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            var member = new RoomMember
            {
                RoomId = roomId,
                UserId = userId,
                Role = RoomRole.Member
            };

            _context.RoomMembers.Add(member);
            await _context.SaveChangesAsync();

            var dto = new
            {
                userId = user.Id,
                username = user.Username,
                role = member.Role
            };

            await _hub.Clients.Group(roomId.ToString())
                .SendAsync("MemberAdded", dto);

            await _hub.Clients.User(userId.ToString())
                .SendAsync("RoomAdded", roomId.ToString());

            return Ok(dto);
        }
    }
}
