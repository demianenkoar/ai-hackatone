namespace AgenticServer.Models
{
    public class Session
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string ConnectionId { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
        public string? IpAddress { get; set; }
        public DateTime LastActiveAt { get; set; }
    }
}
