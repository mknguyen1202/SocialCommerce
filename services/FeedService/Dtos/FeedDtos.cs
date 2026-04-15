namespace FeedService.Dtos
{
    public record FeedItem(Guid PostId, double Rank, DateTimeOffset CreatedAt);
    public record FeedPage(IEnumerable<FeedItem> Items, string? NextCursor);
    public record MarkSeenRequest(DateTimeOffset LastSeenAt);
}