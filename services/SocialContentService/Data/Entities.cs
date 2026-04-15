using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace SocialContentService.Data
{
    public enum Visibility { Public, Followers, Private }

    public class Post
    {
        [Key] public Guid Id { get; set; }
        [Required] public Guid AuthorUserId { get; set; }
        public Guid? GroupId { get; set; }
        [MaxLength(10)] public string Type { get; set; } = "text"; // text|image|video|link|poll
        [MaxLength(300)] public string? Title { get; set; }
        [MaxLength(4000)] public string? Body { get; set; }
        [MaxLength(4000)] public string? Text { get; set; }       // legacy field kept for backward compat
        public JsonArray? Media { get; set; }                      // legacy jsonb array kept for backward compat
        [MaxLength(2048)] public string? LinkUrl { get; set; }
        public JsonObject? ProductRef { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Public;
        public int Upvotes { get; set; }
        public int Downvotes { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }
        public bool PendingReview { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }             // legacy field kept for backward compat
        public DateTimeOffset? EditedAt { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }

    public class PostMedia
    {
        [Required] public Guid PostId { get; set; }
        [Required] public Guid MediaId { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class PostVote
    {
        [Required] public Guid PostId { get; set; }
        [Required] public Guid UserId { get; set; }
        public int Value { get; set; } // +1 or -1
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class PostSave
    {
        [Required] public Guid PostId { get; set; }
        [Required] public Guid UserId { get; set; }
    }

    public class Comment
    {
        [Key] public Guid Id { get; set; }
        [Required] public Guid PostId { get; set; }
        public Guid? ParentId { get; set; }
        [Required] public Guid AuthorUserId { get; set; }
        [MaxLength(2000)] public string Text { get; set; } = default!;
        public short Depth { get; set; }
        public int Upvotes { get; set; }
        public int Downvotes { get; set; }
        public int ReplyCount { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? EditedAt { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }

    public class CommentVote
    {
        [Required] public Guid CommentId { get; set; }
        [Required] public Guid UserId { get; set; }
        public int Value { get; set; } // +1 or -1
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class Reaction
    {
        [Required] public Guid PostId { get; set; }
        [Required] public Guid UserId { get; set; }
        [Required, MaxLength(24)] public string Kind { get; set; } = "like";
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class Poll
    {
        [Key] public Guid Id { get; set; }
        [Required] public Guid PostId { get; set; }
        public int TotalVotes { get; set; }
        public DateTimeOffset? EndsAt { get; set; }
    }

    public class PollOption
    {
        [Key] public Guid Id { get; set; }
        [Required] public Guid PollId { get; set; }
        [Required, MaxLength(200)] public string Label { get; set; } = default!;
        public int Votes { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class PollVote
    {
        [Required] public Guid PollId { get; set; }
        [Required] public Guid UserId { get; set; }
        [Required] public Guid OptionId { get; set; }
    }

    public class Group
    {
        [Key] public Guid Id { get; set; }
        [Required, MaxLength(100)] public string Name { get; set; } = default!;
        [Required, MaxLength(100)] public string Slug { get; set; } = default!;
        public string? Description { get; set; }
        [MaxLength(512)] public string? AvatarUrl { get; set; }
        [MaxLength(512)] public string? BannerUrl { get; set; }
        [MaxLength(12)] public string Visibility { get; set; } = "public"; // public|private|restricted
        public int MemberCount { get; set; }
        [Required] public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class GroupMember
    {
        [Required] public Guid GroupId { get; set; }
        [Required] public Guid UserId { get; set; }
        [MaxLength(12)] public string Role { get; set; } = "member"; // owner|moderator|member
        public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class GroupRule
    {
        [Key] public Guid Id { get; set; }
        [Required] public Guid GroupId { get; set; }
        [Required, MaxLength(200)] public string Title { get; set; } = default!;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class GroupBan
    {
        [Required] public Guid GroupId { get; set; }
        [Required] public Guid UserId { get; set; }
        [Required] public Guid BannedBy { get; set; }
        public string? Reason { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}