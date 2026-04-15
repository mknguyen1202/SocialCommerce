using System.Net.Http.Json;

namespace CommunicationService.Services;

public sealed class RealTimePublisher(HttpClient http, IConfiguration config) : IRealTimePublisher
{
    private readonly string _apiKey = config["Internal:ApiKey"]
        ?? throw new InvalidOperationException("Internal:ApiKey is not configured.");

    public async Task PublishAsync(string group, string eventName, object payload, CancellationToken ct = default)
    {
        using HttpRequestMessage req = new HttpRequestMessage(HttpMethod.Post, "/internal/hub/publish");
        req.Headers.Add("X-Internal-Api-Key", _apiKey);
        req.Content = JsonContent.Create(new { group, @event = eventName, payload });
        try
        {
            await http.SendAsync(req, ct);
        }
        catch
        {
            // Best-effort: don't fail the main operation if the hub is unreachable
        }
    }
}
