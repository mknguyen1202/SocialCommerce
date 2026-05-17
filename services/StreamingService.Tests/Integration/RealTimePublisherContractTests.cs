using FluentAssertions;
using Microsoft.Extensions.Configuration;
using RichardSzalay.MockHttp;
using StreamingService.Services;
using System.Net;
using System.Text.Json;
using Xunit;

namespace StreamingService.Tests.Integration;

/// <summary>
/// Contract tests: verifies that RealTimePublisher sends correctly-shaped
/// HTTP requests to RealTimeHub's /internal/hub/publish endpoint.
/// These tests use MockHttp to intercept and inspect the outbound call
/// without requiring a running hub instance.
/// </summary>
public sealed class RealTimePublisherContractTests
{
    private const string TestApiKey = "test-internal-api-key";
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private static (RealTimePublisher Publisher, MockHttpMessageHandler Handler) MakePublisher()
    {
        MockHttpMessageHandler mockHttp = new MockHttpMessageHandler();
        HttpClient httpClient = mockHttp.ToHttpClient();
        httpClient.BaseAddress = new Uri("http://localhost:9999");

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Internal:ApiKey"] = TestApiKey
            })
            .Build();

        return (new RealTimePublisher(httpClient, config), mockHttp);
    }

    [Fact]
    public async Task TheaterStatus_PublishesCorrectRequestShape()
    {
        (RealTimePublisher publisher, MockHttpMessageHandler handler) = MakePublisher();

        string? capturedBody = null;
        string? capturedApiKey = null;

        handler.When(HttpMethod.Post, "*/internal/hub/publish")
            .Respond(async req =>
            {
                capturedBody = await req.Content!.ReadAsStringAsync();
                capturedApiKey = req.Headers.GetValues("X-Internal-Api-Key").FirstOrDefault();
                return new HttpResponseMessage(HttpStatusCode.OK);
            });

        Guid theaterId = Guid.NewGuid();
        await publisher.PublishAsync(
            group: $"theater:{theaterId}",
            eventName: "theater:status",
            payload: new { theaterId, status = "live" });

        capturedApiKey.Should().Be(TestApiKey);

        JsonElement body = JsonSerializer.Deserialize<JsonElement>(capturedBody!, _json);
        body.GetProperty("group").GetString().Should().Be($"theater:{theaterId}");
        body.GetProperty("event").GetString().Should().Be("theater:status");
        JsonElement payload = body.GetProperty("payload");
        payload.GetProperty("status").GetString().Should().Be("live");
    }

    [Fact]
    public async Task PlaybackSync_PayloadContainsRequiredFields()
    {
        (RealTimePublisher publisher, MockHttpMessageHandler handler) = MakePublisher();

        string? capturedBody = null;
        handler.When(HttpMethod.Post, "*/internal/hub/publish")
            .Respond(async req =>
            {
                capturedBody = await req.Content!.ReadAsStringAsync();
                return new HttpResponseMessage(HttpStatusCode.OK);
            });

        await publisher.PublishAsync(
            group: "theater:some-id",
            eventName: "theater:playback_sync",
            payload: new { positionSeconds = 42.5f, isPlaying = true, serverTime = 1_000_000L });

        JsonElement body = JsonSerializer.Deserialize<JsonElement>(capturedBody!, _json);
        JsonElement payload = body.GetProperty("payload");
        payload.GetProperty("positionSeconds").GetSingle().Should().BeApproximately(42.5f, 0.01f);
        payload.GetProperty("isPlaying").GetBoolean().Should().BeTrue();
        payload.GetProperty("serverTime").GetInt64().Should().Be(1_000_000L);
    }

    [Fact]
    public async Task HubUnreachable_DoesNotThrow_BestEffort()
    {
        (RealTimePublisher publisher, MockHttpMessageHandler handler) = MakePublisher();
        handler.When(HttpMethod.Post, "*/internal/hub/publish")
            .Throw(new HttpRequestException("Hub unreachable"));

        // Should not throw — best-effort pattern
        Func<Task> act = () => publisher.PublishAsync("theater:1", "theater:status", new { status = "live" });
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ViewerJoined_GroupAndEventNameFormatIsCorrect()
    {
        (RealTimePublisher publisher, MockHttpMessageHandler handler) = MakePublisher();
        string? capturedBody = null;
        handler.When(HttpMethod.Post, "*/internal/hub/publish")
            .Respond(async req =>
            {
                capturedBody = await req.Content!.ReadAsStringAsync();
                return new HttpResponseMessage(HttpStatusCode.OK);
            });

        Guid theaterId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await publisher.PublishAsync(
            $"theater:{theaterId}", "theater:viewer_joined",
            new { userId, role = "viewer" });

        JsonElement body = JsonSerializer.Deserialize<JsonElement>(capturedBody!, _json);
        body.GetProperty("group").GetString().Should().MatchRegex(@"^theater:[0-9a-f\-]{36}$");
        body.GetProperty("event").GetString().Should().Be("theater:viewer_joined");
    }
}
