using System.Net.Http.Json;
using FeedService.Dtos;

namespace FeedService.Services
{
    public interface IContentClient
    {
        Task<List<FeedItem>> GetGroupPostsAsync(string groupSlug, DateTimeOffset before, int take, CancellationToken ct);
    }

    public class ContentClient : IContentClient
    {
        private readonly HttpClient _http;
        public ContentClient(HttpClient http) { _http = http; }

        public async Task<List<FeedItem>> GetGroupPostsAsync(string groupSlug, DateTimeOffset before, int take, CancellationToken ct)
        {
            string cursor = Convert.ToBase64String(BitConverter.GetBytes(before.ToUnixTimeMilliseconds()));
            string url = $"/api/social/groups/{Uri.EscapeDataString(groupSlug)}/posts?cursor={Uri.EscapeDataString(cursor)}&take={take}";
            GroupPostsResponse? result = await _http.GetFromJsonAsync<GroupPostsResponse>(url, ct);
            return result?.Items?.Select(p => new FeedItem(p.Id, 0, p.CreatedAt)).ToList() ?? [];
        }

        private record GroupPostsResponse(List<PostSummary>? Items, string? NextCursor);
        private record PostSummary(Guid Id, DateTimeOffset CreatedAt);
    }
}
