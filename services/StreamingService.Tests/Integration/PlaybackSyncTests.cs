using FluentAssertions;
using StreamingService.Dtos;
using StreamingService.Tests.Integration.Helpers;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace StreamingService.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class PlaybackSyncTests : IClassFixture<StreamingServiceFactory>
{
    private readonly StreamingServiceFactory _factory;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public PlaybackSyncTests(StreamingServiceFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient HostClient, string TheaterId)> CreateLiveTheaterAsync()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);

        CreateTheaterDto dto = new(
            Title: "Playback Test Theater",
            Description: null,
            Category: "gaming",
            Tags: [],
            Visibility: "public",
            SourceType: "external_url",
            SourceUrl: "https://example.com/stream",
            SourceMediaId: null,
            MaxViewers: null,
            ScheduledAt: null);

        TheaterDto theater = (await (await client.PostAsJsonAsync("/theaters", dto))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;
        await client.PostAsync($"/theaters/{theater.Id}/start", null);
        return (client, theater.Id.ToString());
    }

    [Fact]
    public async Task GetPlayback_ReturnsInitialState()
    {
        (HttpClient client, string id) = await CreateLiveTheaterAsync();

        HttpResponseMessage response = await client.GetAsync($"/theaters/{id}/playback");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        PlaybackStateDto? state = await response.Content.ReadFromJsonAsync<PlaybackStateDto>(_json);
        state!.PositionSeconds.Should().Be(0f);
        state.IsPlaying.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePlayback_Host_Returns200AndPublishesEvent()
    {
        (HttpClient client, string id) = await CreateLiveTheaterAsync();
        _factory.Publisher.Clear();

        UpdatePlaybackDto update = new(PositionSeconds: 125.4f, IsPlaying: true);
        HttpResponseMessage response = await client.PutAsJsonAsync($"/theaters/{id}/playback", update);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        PlaybackStateDto? state = await response.Content.ReadFromJsonAsync<PlaybackStateDto>(_json);
        state!.PositionSeconds.Should().BeApproximately(125.4f, 0.01f);
        state.IsPlaying.Should().BeTrue();

        IReadOnlyList<PublishedEvent> syncEvents = _factory.Publisher.EventsNamed("theater:playback_sync");
        syncEvents.Should().HaveCount(1);
        syncEvents[0].Group.Should().Be($"theater:{id}");
    }

    [Fact]
    public async Task UpdatePlayback_NonHost_Returns403()
    {
        (HttpClient hostClient, string id) = await CreateLiveTheaterAsync();
        HttpClient viewerClient = _factory.CreateClientWithIdentity(Guid.NewGuid());

        // Viewer joins
        await viewerClient.PostAsync($"/theaters/{id}/join", null);

        UpdatePlaybackDto update = new(PositionSeconds: 10f, IsPlaying: true);
        HttpResponseMessage response = await viewerClient.PutAsJsonAsync($"/theaters/{id}/playback", update);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdatePlayback_VerifyPayloadContainsServerTime()
    {
        (HttpClient client, string id) = await CreateLiveTheaterAsync();
        _factory.Publisher.Clear();

        long beforeMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await client.PutAsJsonAsync($"/theaters/{id}/playback", new UpdatePlaybackDto(50f, true));
        long afterMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        PublishedEvent syncEvent = _factory.Publisher.EventsNamed("theater:playback_sync").Single();
        JsonElement payload = JsonSerializer.SerializeToElement(syncEvent.Payload, _json);
        long serverTime = payload.GetProperty("serverTime").GetInt64();

        serverTime.Should().BeInRange(beforeMs, afterMs + 1000);
    }
}
