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

            // Ensure test users exist
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

            // Ensure General room exists (by ID or Name)
            var generalRoomId = Guid.Parse("550e8400-e29b-41d4-a716-446655440000");

            var generalRoom = await db.Rooms
                .FirstOrDefaultAsync(r => r.Id == generalRoomId || r.Name == "General");

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

            // Ensure we use the existing room ID
            var roomId = generalRoom.Id;

            // Remove existing messages in this room to avoid duplicates
            var existingMessages = await db.Messages
                .Where(m => m.RoomId == roomId)
                .ToListAsync();

            if (existingMessages.Count > 0)
            {
                db.Messages.RemoveRange(existingMessages);
                await db.SaveChangesAsync();
            }

            // Re-fetch users to ensure valid SenderId
            user1 = await db.Users.FirstAsync(u => u.Username == "artem1");
            user2 = await db.Users.FirstAsync(u => u.Username == "artem2");

            var startTime = DateTime.UtcNow.AddMinutes(-100);

            var messages = new List<Message>();

            for (int i = 0; i < 100; i++)
            {
                var sender = (i % 2 == 0) ? user1 : user2;

                messages.Add(new Message
                {
                    Id = Guid.NewGuid(),
                    RoomId = roomId,
                    SenderId = sender.Id,
                    Content = $"Seed message #{i + 1}",
                    Timestamp = startTime.AddMinutes(i)
                });
            }

            db.Messages.AddRange(messages);
            await db.SaveChangesAsync();
        }
    }
}
