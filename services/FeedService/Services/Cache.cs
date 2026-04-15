using Microsoft.EntityFrameworkCore.Storage;
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
        private readonly StackExchange.Redis.IDatabase _db;
        public RedisCache(IConnectionMultiplexer mux) { _db = mux.GetDatabase(); }

        private string Key(Guid userId, string cursorKey) => $"timeline:{userId}:{cursorKey}";

        public async Task<List<Guid>?> GetTimelineAsync(Guid userId, string cursorKey, int take)
        {
            string key = Key(userId, cursorKey);
            RedisValue[] vals = await _db.ListRangeAsync(key, 0, take - 1);
            if (vals.Length == 0) return null;
            return vals.Select(v => Guid.Parse(v!)).ToList();
        }

        public async Task SetTimelineAsync(Guid userId, string cursorKey, IEnumerable<Guid> postIds, TimeSpan ttl)
        {
            string key = Key(userId, cursorKey);
            RedisValue[] arr = postIds.Select(p => (RedisValue)p.ToString()).ToArray();
            if (arr.Length == 0) return;
            await _db.KeyDeleteAsync(key);
            await _db.ListRightPushAsync(key, arr);
            await _db.KeyExpireAsync(key, ttl);
        }

        public Task InvalidateTimelineAsync(Guid userId)
            => _db.KeyDeleteAsync($"timeline:{userId}:*");
    }
}