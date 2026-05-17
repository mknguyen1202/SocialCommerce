using FluentAssertions;
using StreamingService.Dtos;
using StreamingService.Tests.Integration.Helpers;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace StreamingService.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class TheaterLifecycleTests : IClassFixture<StreamingServiceFactory>
{
    private readonly StreamingServiceFactory _factory;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public TheaterLifecycleTests(StreamingServiceFactory factory)
    {
        _factory = factory;
    }

    private static CreateTheaterDto DefaultCreateDto(string? scheduledAt = null) => new(
        Title: "Integration Night",
        Description: "Test theater",
        Category: "gaming",
        Tags: ["test"],
        Visibility: "public",
        SourceType: "external_url",
        SourceUrl: "https://example.com/stream",
        SourceMediaId: null,
        MaxViewers: null,
        ScheduledAt: scheduledAt is null ? null : DateTimeOffset.Parse(scheduledAt));

    // ── Authentication ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTheater_Unauthenticated_Returns401()
    {
        HttpClient client = _factory.CreateClient();
        HttpResponseMessage response = await client.PostAsJsonAsync("/theaters", DefaultCreateDto());
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTheater_ValidPayload_Returns201WithDto()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);

        HttpResponseMessage response = await client.PostAsJsonAsync("/theaters", DefaultCreateDto());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        TheaterDto? dto = await response.Content.ReadFromJsonAsync<TheaterDto>(_json);
        dto.Should().NotBeNull();
        dto!.Title.Should().Be("Integration Night");
        dto.Status.Should().Be("created");
        dto.HostId.Should().Be(hostId);
    }

    [Fact]
    public async Task CreateTheater_WithScheduledAt_StatusIsScheduled()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());
        CreateTheaterDto dto = DefaultCreateDto(scheduledAt: "2027-06-01T20:00:00Z");

        HttpResponseMessage response = await client.PostAsJsonAsync("/theaters", dto);
        TheaterDto? result = await response.Content.ReadFromJsonAsync<TheaterDto>(_json);

        result!.Status.Should().Be("scheduled");
    }

    // ── State machine ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StateTransitions_FullLifecycle_SucceedsAndPublishesEvents()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);
        _factory.Publisher.Clear();

        // Create
        TheaterDto theater = (await (await client.PostAsJsonAsync("/theaters", DefaultCreateDto()))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;
        string id = theater.Id.ToString();

        // Start → live
        HttpResponseMessage startRes = await client.PostAsync($"/theaters/{id}/start", null);
        startRes.StatusCode.Should().Be(HttpStatusCode.OK);
        TheaterDto? live = await startRes.Content.ReadFromJsonAsync<TheaterDto>(_json);
        live!.Status.Should().Be("live");

        // Pause → paused
        HttpResponseMessage pauseRes = await client.PostAsync($"/theaters/{id}/pause", null);
        pauseRes.StatusCode.Should().Be(HttpStatusCode.OK);
        (await pauseRes.Content.ReadFromJsonAsync<TheaterDto>(_json))!.Status.Should().Be("paused");

        // Resume → live
        HttpResponseMessage resumeRes = await client.PostAsync($"/theaters/{id}/resume", null);
        resumeRes.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resumeRes.Content.ReadFromJsonAsync<TheaterDto>(_json))!.Status.Should().Be("live");

        // End → ended
        HttpResponseMessage endRes = await client.PostAsync($"/theaters/{id}/end", null);
        endRes.StatusCode.Should().Be(HttpStatusCode.OK);
        (await endRes.Content.ReadFromJsonAsync<TheaterDto>(_json))!.Status.Should().Be("ended");

        // Verify real-time events were published
        IReadOnlyList<PublishedEvent> statusEvents = _factory.Publisher.EventsNamed("theater:status");
        statusEvents.Should().HaveCount(4); // start, pause, resume, end
        statusEvents.Select(e => e.Group).Distinct().Should()
            .ContainSingle().Which.Should().Be($"theater:{id}");
    }

    [Fact]
    public async Task InvalidTransition_Returns409()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);

        TheaterDto theater = (await (await client.PostAsJsonAsync("/theaters", DefaultCreateDto()))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;
        string id = theater.Id.ToString();

        // Cannot pause a theater that is not live
        HttpResponseMessage response = await client.PostAsync($"/theaters/{id}/pause", null);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task NonHostStart_Returns403()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        HttpClient hostClient = _factory.CreateClientWithIdentity(hostId);
        HttpClient viewerClient = _factory.CreateClientWithIdentity(viewerId);

        TheaterDto theater = (await (await hostClient.PostAsJsonAsync("/theaters", DefaultCreateDto()))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;

        HttpResponseMessage response = await viewerClient.PostAsync($"/theaters/{theater.Id}/start", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Participants ──────────────────────────────────────────────────────────

    [Fact]
    public async Task JoinLeave_UpdatesViewerCount()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        HttpClient hostClient = _factory.CreateClientWithIdentity(hostId);
        HttpClient viewerClient = _factory.CreateClientWithIdentity(viewerId);

        TheaterDto theater = (await (await hostClient.PostAsJsonAsync("/theaters", DefaultCreateDto()))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;
        string id = theater.Id.ToString();

        // Join
        HttpResponseMessage joinRes = await viewerClient.PostAsync($"/theaters/{id}/join", null);
        joinRes.StatusCode.Should().Be(HttpStatusCode.OK);

        TheaterDto? after = await (await viewerClient.GetAsync($"/theaters/{id}"))
            .Content.ReadFromJsonAsync<TheaterDto>(_json);
        after!.ViewerCount.Should().Be(1);

        // Leave
        await viewerClient.PostAsync($"/theaters/{id}/leave", null);
        TheaterDto? afterLeave = await (await viewerClient.GetAsync($"/theaters/{id}"))
            .Content.ReadFromJsonAsync<TheaterDto>(_json);
        afterLeave!.ViewerCount.Should().Be(0);
    }

    [Fact]
    public async Task JoinEndedTheater_Returns409()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);

        TheaterDto theater = (await (await client.PostAsJsonAsync("/theaters", DefaultCreateDto()))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;
        string id = theater.Id.ToString();
        await client.PostAsync($"/theaters/{id}/start", null);
        await client.PostAsync($"/theaters/{id}/end", null);

        HttpResponseMessage joinRes = await client.PostAsync($"/theaters/{id}/join", null);
        joinRes.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
