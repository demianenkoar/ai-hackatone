namespace AgenticServer.Models
{
    public class RoomMember
    {
        public Guid RoomId { get; set; }
        public Room? Room { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public RoomRole Role { get; set; }
        public bool IsBanned { get; set; }

        public Guid? BannedByUserId { get; set; }

        public DateTime? LastReadAt { get; set; }
    }
}
