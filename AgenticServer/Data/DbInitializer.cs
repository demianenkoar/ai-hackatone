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

            // Ensure the "General" room exists and is public
            var generalRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Name == "General");

            if (generalRoom == null)
            {
                generalRoom = new Room
                {
                    Id = Guid.NewGuid(),
                    Name = "General",
                    IsPublic = true,
                    IsPrivate = false,
                    OwnerId = null,
                    CreatedAt = DateTime.UtcNow
                };

                db.Rooms.Add(generalRoom);
                await db.SaveChangesAsync();
            }
            else
            {
                if (!generalRoom.IsPublic)
                {
                    generalRoom.IsPublic = true;
                    generalRoom.IsPrivate = false;
                    await db.SaveChangesAsync();
                }
            }

            var existingMessages = await db.Messages
                .Where(m => m.RoomId == generalRoom.Id)
                .ToListAsync();

            if (existingMessages.Count > 0)
            {
                db.Messages.RemoveRange(existingMessages);
                await db.SaveChangesAsync();
            }

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
                    RoomId = generalRoom.Id,
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
