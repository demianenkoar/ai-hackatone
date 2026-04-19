namespace AgenticServer.Models
{
    public class Message
    {
        public Guid Id { get; set; }

        public Guid RoomId { get; set; }
        public Room? Room { get; set; }

        public Guid SenderId { get; set; }
        public User? Sender { get; set; }

        public Guid? RecipientId { get; set; }
        public User? Recipient { get; set; }

        public string Content { get; set; } = string.Empty;

        public Guid? ReplyToMessageId { get; set; }
        public Message? ReplyToMessage { get; set; }

        public DateTime Timestamp { get; set; }
        public DateTime? EditedAt { get; set; }

        public bool IsDeleted { get; set; } = false;

        public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    }
}
