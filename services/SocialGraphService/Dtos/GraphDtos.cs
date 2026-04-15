namespace SocialGraphService.Dtos
{
    public record PagedIds(IEnumerable<Guid> Items, string? NextCursor);
    public record RelCheck(Guid Me, Guid Other, bool IsFollowing, bool IsBlockedByMe, bool HasBlockedMe);

    public record FriendRequestRead(
        Guid Id, Guid SenderId, Guid ReceiverId,
        string Status, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

    public record BulkIsFollowingRequest(Guid FollowerId, IEnumerable<Guid> FolloweeIds);
    public record BulkIsFollowingResult(Guid FollowerId, Dictionary<Guid, bool> Results);
}
