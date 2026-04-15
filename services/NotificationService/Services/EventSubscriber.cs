using System.Text.Json;
using Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NotificationService.Data;
using StackExchange.Redis;

namespace NotificationService.Services;

/// <summary>
/// Background service that subscribes to all domain event channels on Redis pub/sub.
/// For each event, it persists a <see cref="Notification"/> and pushes it to the
/// user's real-time group via the RealTimeHub.
/// </summary>
public sealed class EventSubscriber : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EventSubscriber> _logger;

    /// <summary>
    /// Map of Redis channel → (domain, title-builder).
    /// The title-builder receives the deserialized <see cref="NotificationPayload"/> and returns
    /// a human-readable notification title.
    /// </summary>
    private static readonly Dictionary<string, (string Domain, Func<NotificationPayload, string> TitleBuilder)> ChannelMap = new()
    {
        [EventTypes.MessageNew]    = ("communication", p => "New message"),
        [EventTypes.CallIncoming]  = ("communication", p => "Incoming call"),
        [EventTypes.FriendRequest] = ("social",        p => "New friend request"),
        [EventTypes.PostReply]     = ("social",        p => "Someone replied to your post"),
        [EventTypes.PostMention]   = ("social",        p => "You were mentioned in a post"),
        [EventTypes.GroupInvite]   = ("social",        p => "Group invitation"),
        [EventTypes.TheaterInvite] = ("streaming",     p => "Theater invitation"),
        [EventTypes.TheaterLive]   = ("streaming",     p => "A user you follow went live"),
        [EventTypes.OrderUpdate]   = ("commerce",      p => "Order status updated"),
        [EventTypes.OrderPlaced]   = ("commerce",      p => "New order placed"),
    };

    public EventSubscriber(
        IConnectionMultiplexer redis,
        IServiceScopeFactory scopeFactory,
        ILogger<EventSubscriber> logger)
    {
        _redis = redis;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        ISubscriber subscriber = _redis.GetSubscriber();

        foreach (string channel in ChannelMap.Keys)
        {
            await subscriber.SubscribeAsync(RedisChannel.Literal(channel), async (_, message) =>
            {
                try
                {
                    await HandleEventAsync(channel, message!, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process event on channel {Channel}", channel);
                }
            });

            _logger.LogInformation("Subscribed to Redis channel: {Channel}", channel);
        }

        // Keep the hosted service alive until the application shuts down
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleEventAsync(string channel, string rawMessage, CancellationToken ct)
    {
        DomainEvent? envelope = JsonSerializer.Deserialize<DomainEvent>(rawMessage, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (envelope?.Data is null)
        {
            _logger.LogWarning("Received empty or malformed event on {Channel}", channel);
            return;
        }

        // Deserialize the inner payload
        NotificationPayload? payload = null;
        if (envelope.Data is JsonElement jsonElement)
        {
            payload = jsonElement.Deserialize<NotificationPayload>(new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }

        if (payload is null || payload.UserId == Guid.Empty)
        {
            _logger.LogWarning("Event on {Channel} missing valid NotificationPayload", channel);
            return;
        }

        (string domain, Func<NotificationPayload, string> titleBuilder) = ChannelMap[channel];

        Notification notification = new()
        {
            UserId = payload.UserId,
            Type = channel,
            Domain = domain,
            Title = string.IsNullOrWhiteSpace(payload.Title) ? titleBuilder(payload) : payload.Title,
            Body = payload.Body,
            ActionUrl = payload.ActionUrl,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Persist
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);

        // Push to user's real-time group
        IRealTimePublisher publisher = scope.ServiceProvider.GetRequiredService<IRealTimePublisher>();
        await publisher.PublishAsync(
            $"user:{payload.UserId}",
            "notification:new",
            new
            {
                notification.Id,
                notification.UserId,
                notification.Type,
                notification.Domain,
                notification.Title,
                notification.Body,
                notification.ActionUrl,
                notification.IsRead,
                notification.CreatedAt
            },
            ct);

        // Also push updated badge count
        int unreadCount = await db.Notifications
            .CountAsync(n => n.UserId == payload.UserId && !n.IsRead, ct);

        await publisher.PublishAsync(
            $"user:{payload.UserId}",
            "notification:badge",
            new { unreadCount },
            ct);

        _logger.LogInformation(
            "Created notification {NotifId} for user {UserId} from {Channel}",
            notification.Id, payload.UserId, channel);
    }
}
