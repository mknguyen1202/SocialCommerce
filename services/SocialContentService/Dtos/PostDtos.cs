using System.Text.Json.Nodes;
using SocialContentService.Data;

namespace SocialContentService.Dtos
{
    public record CreatePostDto(
        string? Title,
        string? Body,
        string? Text = null,           // legacy alias for Body
        string Type = "text",
        string? LinkUrl = null,
        JsonArray? Media = null,       // legacy media array
        JsonObject? ProductRef = null,
        Visibility Visibility = Visibility.Public,
        Guid? GroupId = null,
        IEnumerable<Guid>? MediaIds = null);

    public record UpdatePostDto(
        string? Title,
        string? Body,
        string? LinkUrl,
        Visibility? Visibility);

    public record VoteDto(int Value); // +1, -1, or 0 to remove vote

    public record PostReadDto(
        Guid Id,
        Guid AuthorUserId,
        string? Title,
        string? Body,
        string Type,
        Visibility Visibility,
        Guid? GroupId,
        string? LinkUrl,
        int Upvotes,
        int Downvotes,
        int CommentCount,
        bool PendingReview,
        DateTimeOffset CreatedAt,
        DateTimeOffset? EditedAt,
        bool IsDeleted);

    public static class PostMapping
    {
        public static PostReadDto ToRead(this Post p) => new(
            p.Id,
            p.AuthorUserId,
            p.Title,
            p.Body ?? p.Text,
            p.Type,
            p.Visibility,
            p.GroupId,
            p.LinkUrl,
            p.Upvotes,
            p.Downvotes,
            p.CommentCount,
            p.PendingReview,
            p.CreatedAt,
            p.EditedAt,
            p.DeletedAt.HasValue);
    }
}