namespace Contracts;

/// <summary>
/// Standard envelope for all cross-domain events published via Redis pub/sub
/// or Azure Service Bus in production.
/// </summary>
public sealed class DomainEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Type { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
    public object? Data { get; init; }
}

/// <summary>Well-known event type constants used across services.</summary>
public static class EventTypes
{
    // Communication
    public const string MessageNew = "evt:message:new";
    public const string CallIncoming = "evt:call:incoming";

    // Social
    public const string FriendRequest = "evt:friend:request";
    public const string PostReply = "evt:post:reply";
    public const string PostMention = "evt:post:mention";
    public const string GroupInvite = "evt:group:invite";

    // Streaming
    public const string TheaterInvite = "evt:theater:invite";
    public const string TheaterLive = "evt:theater:live";

    // Commerce
    public const string OrderUpdate = "evt:order:update";
    public const string OrderPlaced = "evt:order:placed";
}

/// <summary>Payload for notification-producing events.</summary>
public sealed class NotificationPayload
{
    public Guid UserId { get; init; }
    public string Domain { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public string? ActionUrl { get; init; }
}
