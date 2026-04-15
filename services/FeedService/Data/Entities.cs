using System.ComponentModel.DataAnnotations;


namespace FeedService.Data
{
    public class Timeline
    {
        [Required] public Guid UserId { get; set; }
        [Required] public Guid PostId { get; set; }
        public double Rank { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }


    public class Marker
    {
        [Key] public Guid UserId { get; set; }
        public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.MinValue;
    }
}