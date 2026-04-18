namespace AgenticServer.Models
{
    public class Room
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrivate { get; set; }

        public Guid? OwnerId { get; set; }
        public User? Owner { get; set; }

        public DateTime CreatedAt { get; set; }

        public ICollection<RoomMember> Members { get; set; } = new List<RoomMember>();
    }
}
