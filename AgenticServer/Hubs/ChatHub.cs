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
        private static readonly Guid SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public ChatHub(ApplicationDbContext db)
        {
            _db = db;
        }

        private Guid ResolveUserId()
        {
            var claimId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(claimId))
            {
                return Guid.Parse(claimId);
            }

            return SystemUserId;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = ResolveUserId().ToString();
            OnlineUsers[userId] = Context.ConnectionId;

            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(Guid roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
        }

        public async Task SendMessage(Guid roomId, string content)
        {
            var senderId = ResolveUserId();

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
