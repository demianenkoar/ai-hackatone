using AgenticServer.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace AgenticServer.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(ApplicationDbContext db)
        {
            await db.Database.MigrateAsync();

            var user1 = await db.Users.FirstOrDefaultAsync(u => u.Username == "artem1");
            if (user1 == null)
            {
                user1 = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "artem1",
                    Email = "artem1@test.local",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
                    CreatedAt = DateTime.UtcNow
                };

                db.Users.Add(user1);
            }

            var user2 = await db.Users.FirstOrDefaultAsync(u => u.Username == "artem2");
            if (user2 == null)
            {
                user2 = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "artem2",
                    Email = "artem2@test.local",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
                    CreatedAt = DateTime.UtcNow
                };

                db.Users.Add(user2);
            }

            await db.SaveChangesAsync();

            var generalRoomId = Guid.Parse("550e8400-e29b-41d4-a716-446655440000");

            var generalRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == generalRoomId);

            if (generalRoom == null)
            {
                generalRoom = new Room
                {
                    Id = generalRoomId,
                    Name = "General",
                    IsPrivate = false,
                    OwnerId = null,
                    CreatedAt = DateTime.UtcNow
                };

                db.Rooms.Add(generalRoom);
                await db.SaveChangesAsync();
            }

            var messagesExist = await db.Messages.AnyAsync(m => m.RoomId == generalRoom.Id);

            if (messagesExist)
                return;

            var startTime = DateTime.UtcNow.AddMinutes(-100);

            var messages = new List<Message>();

            for (int i = 0; i < 100; i++)
            {
                var sender = (i % 2 == 0) ? user1 : user2;

                messages.Add(new Message
                {
                    Id = Guid.NewGuid(),
                    RoomId = generalRoom.Id,
                    SenderId = sender!.Id,
                    Content = $"Seed message #{i + 1}",
                    Timestamp = startTime.AddMinutes(i)
                });
            }

            db.Messages.AddRange(messages);
            await db.SaveChangesAsync();
        }
    }
}
