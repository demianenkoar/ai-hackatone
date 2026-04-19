using System.Collections.Concurrent;
using System.Security.Claims;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;

        private static ConcurrentDictionary<string, string> OnlineUsers = new();
        private static ConcurrentDictionary<string, DateTime> LastActivity = new();

        private static Timer? PresenceTimer;

        static ChatHub()
        {
            PresenceTimer = new Timer(async _ =>
            {
                var now = DateTime.UtcNow;

                foreach (var entry in LastActivity)
                {
                    var diff = now - entry.Value;

                    if (diff.TotalMinutes > 5)
                    {
                        var hub = Program.ServiceProvider
                            .GetRequiredService<IHubContext<ChatHub>>();

                        await hub.Clients.All.SendAsync("UserPresenceChanged", new
                        {
                            userId = entry.Key,
                            status = "afk"
                        });
                    }
                }

            }, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        }

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

        private async Task UpdateActivity(Guid userId)
        {
            var id = userId.ToString();

            LastActivity[id] = DateTime.UtcNow;

            await Clients.All.SendAsync("UserPresenceChanged", new
            {
                userId = id,
                status = "online"
            });
        }

        public override async Task OnConnectedAsync()
        {
            var userId = ResolveUserId().ToString();

            OnlineUsers[userId] = Context.ConnectionId;
            LastActivity[userId] = DateTime.UtcNow;

            await Clients.All.SendAsync("UserPresenceChanged", new
            {
                userId = userId,
                status = "online"
            });

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            var userId = ResolveUserId().ToString();

            OnlineUsers.TryRemove(userId, out _);

            await Clients.All.SendAsync("UserPresenceChanged", new
            {
                userId = userId,
                status = "offline"
            });

            await base.OnDisconnectedAsync(ex);
        }

        public async Task JoinRoom(string roomId)
        {
            Console.WriteLine($"SignalR: connection {Context.ConnectionId} joining room {roomId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        }

        public async Task LeaveRoom(string roomId)
        {
            Console.WriteLine($"SignalR: connection {Context.ConnectionId} leaving room {roomId}");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        }

        public async Task SendMessage(string roomId, string content, string? replyToMessageId)
        {
            var senderId = ResolveUserId();
            var parsedRoomId = Guid.Parse(roomId);

            await UpdateActivity(senderId);

            Guid? replyGuid = null;

            if (!string.IsNullOrEmpty(replyToMessageId))
                replyGuid = Guid.Parse(replyToMessageId);

            var message = new Message
            {
                Id = Guid.NewGuid(),
                RoomId = parsedRoomId,
                SenderId = senderId,
                Content = content,
                ReplyToMessageId = replyGuid,
                Timestamp = DateTime.UtcNow
            };

            _db.Messages.Add(message);
            await _db.SaveChangesAsync();

            var sender = await _db.Users.FindAsync(senderId);

            object? replyTo = null;

            if (replyGuid != null)
            {
                var replyMsg = await _db.Messages
                    .Include(m => m.Sender)
                    .FirstOrDefaultAsync(m => m.Id == replyGuid);

                if (replyMsg != null)
                {
                    replyTo = new
                    {
                        id = replyMsg.Id,
                        senderName = replyMsg.Sender != null ? replyMsg.Sender.Username : "Unknown",
                        content = replyMsg.Content
                    };
                }
            }

            var dto = new
            {
                id = message.Id,
                roomId = message.RoomId,
                senderId = message.SenderId,
                senderName = sender?.Username ?? "Unknown",
                replyToMessageId = message.ReplyToMessageId,
                replyTo = replyTo,
                content = message.Content,
                timestamp = message.Timestamp,
                isDeleted = message.IsDeleted
            };

            Console.WriteLine($"SignalR: broadcasting message to room {roomId}");

            await Clients.Group(roomId).SendAsync("ReceiveMessage", dto);

            var members = await _db.RoomMembers
                .Where(m => m.RoomId == parsedRoomId && m.UserId != senderId)
                .Select(m => m.UserId)
                .ToListAsync();

            foreach (var memberId in members)
            {
                Console.WriteLine($"Sending unread update for room {roomId} to user {memberId}");

                await Clients.User(memberId.ToString())
                    .SendAsync("UnreadIncrement", roomId);
            }
        }

        public async Task SendTypingNotification(string roomId, bool isTyping)
        {
            await UpdateActivity(ResolveUserId());

            var username = Context.User?.Identity?.Name ?? "User";

            await Clients.OthersInGroup(roomId)
                .SendAsync("UserTyping", username, roomId, isTyping);
        }
    }
}
