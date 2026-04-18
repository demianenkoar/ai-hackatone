using System.Collections.Concurrent;
using System.Security.Claims;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;

        private static ConcurrentDictionary<string, string> OnlineUsers = new();

        public ChatHub(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task SendMessage(Guid roomId, string message)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                throw new HubException("User not identified");

            var senderId = Guid.Parse(userId);

            var membership = await _db.RoomMembers
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == senderId);

            if (membership == null || membership.IsBanned)
                throw new HubException("User is not allowed to send messages in this room");

            var msg = new Message
            {
                Id = Guid.NewGuid(),
                RoomId = roomId,
                SenderId = senderId,
                Content = message,
                Timestamp = DateTime.UtcNow
            };

            _db.Messages.Add(msg);
            await _db.SaveChangesAsync();

            await Clients.Group(roomId.ToString()).SendAsync(
                "ReceiveMessage",
                msg.Id,
                roomId,
                senderId,
                message,
                msg.Timestamp
            );
        }

        public async Task JoinRoom(Guid roomId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                throw new HubException("User not identified");

            var parsedUserId = Guid.Parse(userId);

            var membership = await _db.RoomMembers
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == parsedUserId);

            if (membership == null || membership.IsBanned)
                throw new HubException("User is not allowed to join this room");

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers[userId] = Context.ConnectionId;
                await Clients.All.SendAsync("UserStatusChanged", userId, true);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers.TryRemove(userId, out _);
                await Clients.All.SendAsync("UserStatusChanged", userId, false);
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
