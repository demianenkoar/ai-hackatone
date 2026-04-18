namespace AgenticServer.Models
{
    public class Friendship
    {
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid FriendId { get; set; }
        public User? Friend { get; set; }

        public FriendshipStatus Status { get; set; }
        public bool Banned { get; set; }
    }
}
