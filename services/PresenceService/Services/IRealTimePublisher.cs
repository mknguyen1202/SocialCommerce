namespace PresenceService.Services;

public interface IRealTimePublisher
{
    Task PublishAsync(string group, string eventName, object payload, CancellationToken ct = default);
}
