using Microsoft.EntityFrameworkCore.Storage;
using StackExchange.Redis;

namespace ModerationService.Services
{
    public interface IDecisionCache
    {
        Task CacheDecisionAsync(string targetType, Guid targetId, string action, TimeSpan? ttl);
        Task<string?> GetDecisionAsync(string targetType, Guid targetId);
        Task InvalidateAsync(string targetType, Guid targetId);
    }

    public class RedisDecisionCache : IDecisionCache
    {
        private readonly StackExchange.Redis.IDatabase _db;
        public RedisDecisionCache(IConnectionMultiplexer mux) { _db = mux.GetDatabase(); }
        private static string Key(string t, Guid id) => $"decision:{t}:{id}";
        public async Task CacheDecisionAsync(string t, Guid id, string action, TimeSpan? ttl)
        {
            string k = Key(t, id);
            await _db.StringSetAsync(k, action, ttl);
        }
        public Task<string?> GetDecisionAsync(string t, Guid id)
            => _db.StringGetAsync(Key(t, id)).ContinueWith(t => (string?)t.Result);
        public Task InvalidateAsync(string t, Guid id)
            => _db.KeyDeleteAsync(Key(t, id));
    }
}