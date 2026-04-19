using System.ComponentModel.DataAnnotations;
namespace AgenticServer.Models;
public class Channel {
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Title { get; set; } = string.Empty;
    public bool IsPublic { get; set; } = true;
}
