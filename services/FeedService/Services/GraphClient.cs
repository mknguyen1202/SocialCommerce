using System.Net.Http.Json;

namespace FeedService.Services
{
    public interface IGraphClient
    {
        Task<HashSet<Guid>> GetFolloweesAsync(Guid me, CancellationToken ct);
        Task<HashSet<Guid>> GetFollowersAsync(Guid userId, CancellationToken ct);
        Task<(HashSet<Guid> blocks, HashSet<Guid> blockedBy)> GetBlocksAsync(Guid me, CancellationToken ct);
    }

    public class GraphClient : IGraphClient
    {
        private readonly HttpClient _http;
        public GraphClient(HttpClient http) { _http = http; }

        public async Task<HashSet<Guid>> GetFolloweesAsync(Guid me, CancellationToken ct)
        {
            PagedIdsDto? res = await _http.GetFromJsonAsync<PagedIdsDto>($"/api/graph/{me}/following?take=1000", ct);
            return new HashSet<Guid>(res?.Items ?? []);
        }

        public async Task<HashSet<Guid>> GetFollowersAsync(Guid userId, CancellationToken ct)
        {
            PagedIdsDto? res = await _http.GetFromJsonAsync<PagedIdsDto>($"/api/graph/{userId}/followers?take=1000", ct);
            return new HashSet<Guid>(res?.Items ?? []);
        }

        public async Task<(HashSet<Guid> blocks, HashSet<Guid> blockedBy)> GetBlocksAsync(Guid me, CancellationToken ct)
        {
            BlocksDto? dto = await _http.GetFromJsonAsync<BlocksDto>($"/api/graph/{me}/blocks?direction=both", ct) ?? new BlocksDto(null, null);
            return (new(dto.blocks ?? []), new(dto.blockedBy ?? []));
        }

        private record PagedIdsDto(IEnumerable<Guid> Items, string? NextCursor);
        private record BlocksDto(List<Guid>? blocks, List<Guid>? blockedBy);
    }
}