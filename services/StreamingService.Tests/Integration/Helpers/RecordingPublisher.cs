using StreamingService.Services;
using System.Collections.Concurrent;

namespace StreamingService.Tests.Integration.Helpers;

/// <summary>
/// Test double for IRealTimePublisher that records every publish call
/// so integration tests can assert which real-time events were emitted.
/// </summary>
public sealed class RecordingPublisher : IRealTimePublisher
{
    private readonly ConcurrentBag<PublishedEvent> _events = new();

    public IReadOnlyList<PublishedEvent> Events => _events.ToList();

    public Task PublishAsync(string group, string eventName, object payload, CancellationToken ct = default)
    {
        _events.Add(new PublishedEvent(group, eventName, payload));
        return Task.CompletedTask;
    }

    /// <summary>Returns all events whose event name matches <paramref name="eventName"/>.</summary>
    public IReadOnlyList<PublishedEvent> EventsNamed(string eventName) =>
        _events.Where(e => e.EventName == eventName).ToList();

    public void Clear() => _events.Clear();
}

public sealed record PublishedEvent(string Group, string EventName, object Payload);
