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
                    r.IsPrivate,
                    r.OwnerId
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
                    role = m.Role,
                    isOwner = m.Role == RoomRole.Owner
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

            var roomDto = new
            {
                room.Id,
                room.Name,
                room.IsPublic,
                room.IsPrivate,
                room.OwnerId
            };

            if (room.IsPublic)
            {
                await _hub.Clients.All.SendAsync("NewRoomAdded", roomDto);
            }
            else
            {
                await _hub.Clients.User(userId.ToString())
                    .SendAsync("NewRoomAdded", roomDto);
            }

            return Ok(roomDto);
        }

        [HttpPost("direct/{userId}")]
        public async Task<IActionResult> CreateDirectRoom(Guid userId)
        {
            var currentUserId = CurrentUserId();

            if (userId == currentUserId)
                return BadRequest("Cannot create DM with yourself.");

            var existing = await _context.Rooms
                .Where(r => !r.IsPublic && r.OwnerId == null)
                .Where(r =>
                    r.Members.Any(m => m.UserId == currentUserId) &&
                    r.Members.Any(m => m.UserId == userId))
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return Ok(new
                {
                    existing.Id,
                    existing.Name,
                    existing.IsPublic,
                    existing.IsPrivate,
                    existing.OwnerId,
                    isDirect = true
                });
            }

            var otherUser = await _context.Users.FindAsync(userId);
            if (otherUser == null)
                return NotFound();

            var room = new Room
            {
                Id = Guid.NewGuid(),
                Name = otherUser.Username,
                IsPublic = false,
                IsPrivate = true,
                OwnerId = null,
                CreatedAt = DateTime.UtcNow
            };

            _context.Rooms.Add(room);

            _context.RoomMembers.Add(new RoomMember
            {
                RoomId = room.Id,
                UserId = currentUserId,
                Role = RoomRole.Member
            });

            _context.RoomMembers.Add(new RoomMember
            {
                RoomId = room.Id,
                UserId = userId,
                Role = RoomRole.Member
            });

            await _context.SaveChangesAsync();

            var roomDto = new
            {
                room.Id,
                room.Name,
                room.IsPublic,
                room.IsPrivate,
                room.OwnerId,
                isDirect = true
            };

            await _hub.Clients.User(userId.ToString())
                .SendAsync("NewRoomAdded", roomDto);

            return Ok(roomDto);
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

            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null)
                return NotFound("Room not found.");

            var member = new RoomMember
            {
                RoomId = roomId,
                UserId = userId,
                Role = RoomRole.Member
            };

            _context.RoomMembers.Add(member);
            await _context.SaveChangesAsync();

            var memberDto = new
            {
                userId = user.Id,
                username = user.Username,
                role = member.Role
            };

            await _hub.Clients.Group(roomId.ToString())
                .SendAsync("MemberAdded", memberDto);

            var roomDto = new
            {
                room.Id,
                room.Name,
                room.IsPublic,
                room.IsPrivate,
                room.OwnerId
            };

            await _hub.Clients.User(userId.ToString())
                .SendAsync("NewRoomAdded", roomDto);

            return Ok(memberDto);
        }

        [HttpPost("{roomId}/read")]
        public async Task<IActionResult> MarkRoomRead(Guid roomId)
        {
            var userId = CurrentUserId();

            var membership = await _context.RoomMembers
                .FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == userId);

            if (membership == null)
                return NotFound("You are not a member of this room.");

            membership.LastReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("{roomId}/kick/{userId}")]
        public async Task<IActionResult> KickUser(Guid roomId, Guid userId)
        {
            var currentUserId = CurrentUserId();

            var room = await _context.Rooms
                .FirstOrDefaultAsync(r => r.Id == roomId);

            if (room == null)
                return NotFound("Room not found");

            if (room.OwnerId != currentUserId)
                return Forbid("Only the owner can kick users");

            if (userId == room.OwnerId)
                return BadRequest("Owner cannot be kicked");

            var membership = await _context.RoomMembers
                .FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == userId);

            if (membership == null)
                return NotFound("User is not in this room");

            _context.RoomMembers.Remove(membership);

            await _context.SaveChangesAsync();

            await _hub.Clients.User(userId.ToString())
                .SendAsync("KickedFromRoom", roomId);

            await _hub.Clients.Group(roomId.ToString())
                .SendAsync("MemberRemoved", new { userId });

            return NoContent();
        }

        [HttpDelete("{roomId}")]
        public async Task<IActionResult> DeleteRoom(Guid roomId)
        {
            var userId = CurrentUserId();

            var room = await _context.Rooms
                .Include(r => r.Members)
                .FirstOrDefaultAsync(r => r.Id == roomId);

            if (room == null)
                return NotFound();

            if (room.OwnerId != userId && room.OwnerId != null)
                return Forbid();

            var memberIds = await _context.RoomMembers
                .Where(m => m.RoomId == roomId)
                .Select(m => m.UserId)
                .ToListAsync();

            foreach (var memberId in memberIds)
            {
                await _hub.Clients.User(memberId.ToString())
                    .SendAsync("RoomDeleted", roomId);
            }

            var messages = _context.Messages.Where(m => m.RoomId == roomId);
            _context.Messages.RemoveRange(messages);

            var members = _context.RoomMembers.Where(m => m.RoomId == roomId);
            _context.RoomMembers.RemoveRange(members);

            _context.Rooms.Remove(room);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
