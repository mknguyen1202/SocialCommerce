namespace NotificationService.Dtos;

public record PagedResult<T>(IEnumerable<T> Items, string? NextCursor, bool HasMore);

public record NotificationDto(
    Guid Id,
    Guid UserId,
    string Type,
    string Domain,
    string Title,
    string Body,
    string? ActionUrl,
    bool IsRead,
    DateTimeOffset CreatedAt);

public record UnreadCountDto(int UnreadCount);
