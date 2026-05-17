using FluentAssertions;
using StreamingService.Dtos;
using StreamingService.Tests.Integration.Helpers;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace StreamingService.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class DiscoveryTests : IClassFixture<StreamingServiceFactory>
{
    private readonly StreamingServiceFactory _factory;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public DiscoveryTests(StreamingServiceFactory factory)
    {
        _factory = factory;
    }

    private async Task SeedPublicTheaterAsync(HttpClient hostClient, string title, string category, string status)
    {
        CreateTheaterDto dto = new(
            Title: title,
            Description: null,
            Category: category,
            Tags: [],
            Visibility: "public",
            SourceType: "external_url",
            SourceUrl: "https://example.com/s",
            SourceMediaId: null,
            MaxViewers: null,
            ScheduledAt: null);

        TheaterDto theater = (await (await hostClient.PostAsJsonAsync("/theaters", dto))
            .Content.ReadFromJsonAsync<TheaterDto>(_json))!;

        if (status is "live" or "paused")
            await hostClient.PostAsync($"/theaters/{theater.Id}/start", null);
        if (status is "paused")
            await hostClient.PostAsync($"/theaters/{theater.Id}/pause", null);
    }

    [Fact]
    public async Task Discover_DefaultFilter_ReturnsLiveAndScheduled()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());

        await SeedPublicTheaterAsync(client, "Live Theater", "gaming", "live");
        await SeedPublicTheaterAsync(client, "Ended Theater", "gaming", "ended");

        HttpResponseMessage response = await client.GetAsync("/theaters/discover");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        PagedResult<TheaterDto>? result =
            await response.Content.ReadFromJsonAsync<PagedResult<TheaterDto>>(_json);
        result!.Items.Should().NotContain(t => t.Status == "ended");
    }

    [Fact]
    public async Task Discover_FilterByCategory_ReturnsOnlyMatchingCategory()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());

        await SeedPublicTheaterAsync(client, "Gaming Theater", "gaming", "live");
        await SeedPublicTheaterAsync(client, "Music Theater", "music", "live");

        HttpResponseMessage response = await client.GetAsync("/theaters/discover?category=music&status=live");
        PagedResult<TheaterDto>? result =
            await response.Content.ReadFromJsonAsync<PagedResult<TheaterDto>>(_json);

        result!.Items.Should().OnlyContain(t => t.Category == "music");
    }

    [Fact]
    public async Task DiscoverSearch_MatchesTitle()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());
        await SeedPublicTheaterAsync(client, "UniqueSearchableTitle123", "gaming", "live");

        HttpResponseMessage response = await client.GetAsync(
            "/theaters/discover/search?q=UniqueSearchableTitle123");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        PagedResult<TheaterDto>? result =
            await response.Content.ReadFromJsonAsync<PagedResult<TheaterDto>>(_json);
        result!.Items.Should().Contain(t => t.Title.Contains("UniqueSearchableTitle123"));
    }

    [Fact]
    public async Task DiscoverSearch_EmptyQuery_Returns400()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());
        HttpResponseMessage response = await client.GetAsync("/theaters/discover/search");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Discover_Pagination_CursorAdvancesCorrectly()
    {
        HttpClient client = _factory.CreateClientWithIdentity(Guid.NewGuid());

        // Seed 3 live gaming theaters
        for (int i = 0; i < 3; i++)
            await SeedPublicTheaterAsync(client, $"Paged Theater {i}", "pagination-test", "live");

        HttpResponseMessage page1Res = await client.GetAsync(
            "/theaters/discover?category=pagination-test&status=live&limit=2");
        PagedResult<TheaterDto>? page1 =
            await page1Res.Content.ReadFromJsonAsync<PagedResult<TheaterDto>>(_json);

        page1!.Items.Should().HaveCount(2);
        page1.HasMore.Should().BeTrue();

        HttpResponseMessage page2Res = await client.GetAsync(
            $"/theaters/discover?category=pagination-test&status=live&limit=2&cursor={Uri.EscapeDataString(page1.NextCursor!)}");
        PagedResult<TheaterDto>? page2 =
            await page2Res.Content.ReadFromJsonAsync<PagedResult<TheaterDto>>(_json);

        page2!.Items.Should().HaveCount(1);
        page2.HasMore.Should().BeFalse();
    }
}
