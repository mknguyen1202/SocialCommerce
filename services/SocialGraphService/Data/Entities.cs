using System.ComponentModel.DataAnnotations;

namespace SocialGraphService.Data
{
    public class Follow
    {
        [Required] public Guid FollowerUserId { get; set; }
        [Required] public Guid FolloweeUserId { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class Block
    {
        [Required] public Guid BlockerUserId { get; set; }
        [Required] public Guid BlockedUserId { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class FriendRequest
    {
        [Key] public Guid Id { get; set; } = Guid.NewGuid();
        [Required] public Guid SenderId { get; set; }
        [Required] public Guid ReceiverId { get; set; }
        [MaxLength(10)] public string Status { get; set; } = "pending"; // pending|accepted|declined
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}