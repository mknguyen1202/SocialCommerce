using SocialContentService.Services;

public sealed class NoOpBusPublisher : IBusPublisher
{
    public Task PublishAsync(string type, object payload, CancellationToken ct = default) => Task.CompletedTask;
}
