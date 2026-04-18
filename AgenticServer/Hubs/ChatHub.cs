using System.Collections.Concurrent;
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
            var senderIdString = Context.UserIdentifier;

            if (string.IsNullOrEmpty(senderIdString))
                throw new HubException("User not identified");

            var senderId = Guid.Parse(senderIdString);

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
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
        }

        public override Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            OnlineUsers[userId] = Context.ConnectionId;

            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            OnlineUsers.TryRemove(userId, out _);

            return base.OnDisconnectedAsync(exception);
        }
    }
}
