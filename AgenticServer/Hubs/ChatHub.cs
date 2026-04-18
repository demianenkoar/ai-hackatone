using System.Collections.Concurrent;
using System.Security.Claims;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.SignalR;

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

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers[userId] = Context.ConnectionId;
            }

            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(Guid roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
        }

        public async Task SendMessage(Guid roomId, string content)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                throw new HubException("User not identified");

            var senderId = Guid.Parse(userId);

            var message = new Message
            {
                Id = Guid.NewGuid(),
                RoomId = roomId,
                SenderId = senderId,
                Content = content,
                Timestamp = DateTime.UtcNow
            };

            _db.Messages.Add(message);
            await _db.SaveChangesAsync();

            await Clients.Group(roomId.ToString()).SendAsync(
                "ReceiveMessage",
                message.Id,
                message.RoomId,
                message.SenderId,
                message.Content,
                message.Timestamp
            );
        }
    }
}
