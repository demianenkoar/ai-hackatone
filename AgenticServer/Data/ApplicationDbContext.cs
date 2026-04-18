using AgenticServer.Models;
using Microsoft.EntityFrameworkCore;

namespace AgenticServer.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Session> Sessions => Set<Session>();
        public DbSet<Room> Rooms => Set<Room>();
        public DbSet<RoomMember> RoomMembers => Set<RoomMember>();
        public DbSet<Friendship> Friendships => Set<Friendship>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<Attachment> Attachments => Set<Attachment>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Room>()
                .HasIndex(r => r.Name)
                .IsUnique();

            modelBuilder.Entity<RoomMember>()
                .HasKey(rm => new { rm.RoomId, rm.UserId });

            modelBuilder.Entity<Friendship>()
                .HasKey(f => new { f.UserId, f.FriendId });

            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.Friend)
                .WithMany()
                .HasForeignKey(f => f.FriendId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<RoomMember>()
                .HasOne(rm => rm.Room)
                .WithMany()
                .HasForeignKey(rm => rm.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RoomMember>()
                .HasOne(rm => rm.User)
                .WithMany()
                .HasForeignKey(rm => rm.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<RoomMember>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(rm => rm.BannedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Message>()
                .Property(m => m.Content)
                .HasMaxLength(3072);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Recipient)
                .WithMany()
                .HasForeignKey(m => m.RecipientId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.ReplyToMessage)
                .WithMany()
                .HasForeignKey(m => m.ReplyToMessageId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
