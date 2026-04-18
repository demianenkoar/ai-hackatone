using System.Collections.Concurrent;
using System.Security.Claims;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AgenticServer.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;

        private static ConcurrentDictionary<string, string> OnlineUsers = new();

        public ChatHub(ApplicationDbContext db)
        {
            _db = db;
        }

        private Guid ResolveUserId()
        {
            var claimId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(claimId))
                throw new Exception("User not authenticated");

            return Guid.Parse(claimId);
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

            var sender = await _db.Users.FindAsync(senderId);

            await Clients.Group(roomId.ToString()).SendAsync("ReceiveMessage", new
            {
                id = message.Id,
                roomId = message.RoomId,
                senderId = message.SenderId,
                senderName = sender?.Username ?? "Unknown",
                content = message.Content,
                timestamp = message.Timestamp
            });
        }
    }
}
