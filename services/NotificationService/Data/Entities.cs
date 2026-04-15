namespace NotificationService.Data;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    /// <summary>Event type that produced this notification (e.g. "evt:message:new").</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Originating domain: communication, social, streaming, commerce.</summary>
    public string Domain { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Deep link URL the client should navigate to on click.</summary>
    public string? ActionUrl { get; set; }

    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
