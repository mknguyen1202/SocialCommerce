using FluentAssertions;
using StreamingService.Dtos;
using StreamingService.Tests.Integration.Helpers;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace StreamingService.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class ChatTests : IClassFixture<StreamingServiceFactory>
{
    private readonly StreamingServiceFactory _factory;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public ChatTests(StreamingServiceFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid HostId, string TheaterId, HttpClient HostClient)> CreateLiveTheaterAsync()
    {
        Guid hostId = Guid.NewGuid();
        HttpClient client = _factory.CreateClientWithIdentity(hostId);

        CreateTheaterDto dto = new(
            Title: "Chat Test Theater",
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
        return (hostId, theater.Id.ToString(), client);
    }

    [Fact]
    public async Task SendChat_AsParticipant_Returns200AndPublishesEvent()
    {
        (_, string id, HttpClient hostClient) = await CreateLiveTheaterAsync();
        _factory.Publisher.Clear();

        HttpResponseMessage response = await hostClient.PostAsJsonAsync(
            $"/theaters/{id}/chat",
            new SendChatMessageDto("Hello everyone!"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        ChatMessageDto? msg = await response.Content.ReadFromJsonAsync<ChatMessageDto>(_json);
        msg!.Content.Should().Be("Hello everyone!");

        _factory.Publisher.EventsNamed("theater:chat_message").Should().HaveCount(1);
    }

    [Fact]
    public async Task SendChat_MutedViewer_Returns403()
    {
        (_, string id, HttpClient hostClient) = await CreateLiveTheaterAsync();
        Guid viewerId = Guid.NewGuid();
        HttpClient viewerClient = _factory.CreateClientWithIdentity(viewerId);
        await viewerClient.PostAsync($"/theaters/{id}/join", null);

        // Host mutes the viewer
        HttpResponseMessage muteRes = await hostClient.PostAsync(
            $"/theaters/{id}/participants/{viewerId}/mute-chat", null);
        muteRes.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Muted viewer tries to chat
        HttpResponseMessage chatRes = await viewerClient.PostAsJsonAsync(
            $"/theaters/{id}/chat",
            new SendChatMessageDto("Can I still chat?"));
        chatRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteChatMessage_AsAuthor_Returns204AndPublishesEvent()
    {
        (_, string id, HttpClient hostClient) = await CreateLiveTheaterAsync();
        _factory.Publisher.Clear();

        ChatMessageDto? msg = await (await hostClient.PostAsJsonAsync(
            $"/theaters/{id}/chat",
            new SendChatMessageDto("Delete me")))
            .Content.ReadFromJsonAsync<ChatMessageDto>(_json);

        HttpResponseMessage deleteRes = await hostClient.DeleteAsync(
            $"/theaters/{id}/chat/{msg!.Id}");
        deleteRes.StatusCode.Should().Be(HttpStatusCode.NoContent);

        _factory.Publisher.EventsNamed("theater:chat_delete").Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteChatMessage_NonAuthorNonMod_Returns403()
    {
        (_, string id, HttpClient hostClient) = await CreateLiveTheaterAsync();
        Guid viewerId = Guid.NewGuid();
        HttpClient viewerClient = _factory.CreateClientWithIdentity(viewerId);
        await viewerClient.PostAsync($"/theaters/{id}/join", null);

        // Host sends message
        ChatMessageDto? msg = await (await hostClient.PostAsJsonAsync(
            $"/theaters/{id}/chat",
            new SendChatMessageDto("Host's message")))
            .Content.ReadFromJsonAsync<ChatMessageDto>(_json);

        // Viewer tries to delete host's message
        HttpResponseMessage deleteRes = await viewerClient.DeleteAsync(
            $"/theaters/{id}/chat/{msg!.Id}");
        deleteRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetChatHistory_ReturnsCursorPaged_NewestFirst()
    {
        (_, string id, HttpClient hostClient) = await CreateLiveTheaterAsync();

        // Send multiple messages
        for (int i = 0; i < 3; i++)
        {
            await hostClient.PostAsJsonAsync($"/theaters/{id}/chat",
                new SendChatMessageDto($"Message {i}"));
        }

        HttpResponseMessage response = await hostClient.GetAsync(
            $"/theaters/{id}/chat?limit=2");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        PagedResult<ChatMessageDto>? paged =
            await response.Content.ReadFromJsonAsync<PagedResult<ChatMessageDto>>(_json);
        paged!.Items.Should().HaveCount(2);
        paged.HasMore.Should().BeTrue();
        paged.NextCursor.Should().NotBeNullOrEmpty();

        // Second page
        HttpResponseMessage page2Res = await hostClient.GetAsync(
            $"/theaters/{id}/chat?limit=2&cursor={Uri.EscapeDataString(paged.NextCursor!)}");
        PagedResult<ChatMessageDto>? page2 =
            await page2Res.Content.ReadFromJsonAsync<PagedResult<ChatMessageDto>>(_json);
        page2!.Items.Should().HaveCount(1);
        page2.HasMore.Should().BeFalse();
    }
}
