using StackExchange.Redis;

namespace FeedService.Services
{
    public interface ICache
    {
        Task<List<Guid>?> GetTimelineAsync(Guid userId, string cursorKey, int take);
        Task SetTimelineAsync(Guid userId, string cursorKey, IEnumerable<Guid> postIds, TimeSpan ttl);
        Task InvalidateTimelineAsync(Guid userId);
    }

    public class RedisCache : ICache
    {
        private readonly IDatabase _db;
        private readonly ILogger<RedisCache> _log;
        public RedisCache(IConnectionMultiplexer mux, ILogger<RedisCache> log) { _db = mux.GetDatabase(); _log = log; }

        private string Key(Guid userId, string cursorKey) => $"timeline:{userId}:{cursorKey}";

        public async Task<List<Guid>?> GetTimelineAsync(Guid userId, string cursorKey, int take)
        {
            try
            {
                string key = Key(userId, cursorKey);
                RedisValue[] vals = await _db.ListRangeAsync(key, 0, take - 1);
                if (vals.Length == 0) return null;
                return vals.Select(v => Guid.Parse(v!)).ToList();
            }
            catch (RedisConnectionException ex)
            {
                _log.LogWarning(ex, "Redis unavailable for GetTimeline, falling through to DB");
                return null;
            }
        }

        public async Task SetTimelineAsync(Guid userId, string cursorKey, IEnumerable<Guid> postIds, TimeSpan ttl)
        {
            try
            {
                string key = Key(userId, cursorKey);
                RedisValue[] arr = postIds.Select(p => (RedisValue)p.ToString()).ToArray();
                if (arr.Length == 0) return;
                await _db.KeyDeleteAsync(key);
                await _db.ListRightPushAsync(key, arr);
                await _db.KeyExpireAsync(key, ttl);
            }
            catch (RedisConnectionException ex)
            {
                _log.LogWarning(ex, "Redis unavailable for SetTimeline, skipping cache write");
            }
        }

        public async Task InvalidateTimelineAsync(Guid userId)
        {
            try
            {
                await _db.KeyDeleteAsync($"timeline:{userId}:*");
            }
            catch (RedisConnectionException ex)
            {
                _log.LogWarning(ex, "Redis unavailable for InvalidateTimeline, skipping");
            }
        }
    }
}