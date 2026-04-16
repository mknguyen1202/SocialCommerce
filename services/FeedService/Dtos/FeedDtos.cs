namespace FeedService.Dtos
{
    public record FeedItem(Guid PostId, double Rank, DateTimeOffset CreatedAt);
    public record FeedPage(IEnumerable<object> Data, string? NextCursor, bool HasMore);
    public record MarkSeenRequest(DateTimeOffset LastSeenAt);

    /// <summary>Mirrors SocialContentService PostReadDto for hydration.</summary>
    public record HydratedPost(
        Guid Id,
        Guid AuthorUserId,
        string? Title,
        string? Body,
        string Type,
        int Visibility,
        Guid? GroupId,
        string? LinkUrl,
        int Upvotes,
        int Downvotes,
        int CommentCount,
        bool PendingReview,
        DateTimeOffset CreatedAt,
        DateTimeOffset? EditedAt,
        bool IsDeleted);
}