using PresenceService.Dtos;
using StackExchange.Redis;

namespace PresenceService.Services;

public class PresenceRedisService(IConnectionMultiplexer redis, IRealTimePublisher rt)
{
    private static readonly TimeSpan HeartbeatTtl = TimeSpan.FromSeconds(90);
    private static readonly TimeSpan TypingTtl = TimeSpan.FromSeconds(5);

    private IDatabase Db => redis.GetDatabase();

    // ── Heartbeat ─────────────────────────────────────────────────────────────

    public async Task HeartbeatAsync(Guid userId, string status, CancellationToken ct)
    {
        string key = $"presence:{userId}";
        await Db.StringSetAsync(key, status, HeartbeatTtl);

        await rt.PublishAsync($"presence:{userId}", "presence:update", new
        {
            userId,
            status,
            lastSeen = DateTimeOffset.UtcNow
        }, ct);
    }

    // ── Single lookup ─────────────────────────────────────────────────────────

    public async Task<PresenceDto> GetAsync(Guid userId)
    {
        RedisValueWithExpiry val = await Db.StringGetWithExpiryAsync($"presence:{userId}");
        string status = val.Value.HasValue ? val.Value.ToString() : "offline";
        // Approximate lastSeen from remaining TTL
        DateTimeOffset lastSeen = val.Expiry.HasValue
            ? DateTimeOffset.UtcNow.Add(val.Expiry.Value - HeartbeatTtl)
            : DateTimeOffset.UtcNow;
        return new PresenceDto(userId, status, lastSeen);
    }

    // ── Bulk lookup ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PresenceDto>> BulkGetAsync(IReadOnlyList<Guid> userIds)
    {
        if (userIds.Count == 0) return [];

        IBatch batch = Db.CreateBatch();
        List<(Guid id, Task<RedisValueWithExpiry> task)> tasks = userIds
            .Select(id => (id, task: batch.StringGetWithExpiryAsync($"presence:{id}")))
            .ToList();
        batch.Execute();

        List<PresenceDto> results = new List<PresenceDto>(userIds.Count);
        foreach ((Guid id, Task<RedisValueWithExpiry> task) in tasks)
        {
            RedisValueWithExpiry val = await task;
            string status = val.Value.HasValue ? val.Value.ToString() : "offline";
            DateTimeOffset lastSeen = val.Expiry.HasValue
                ? DateTimeOffset.UtcNow.Add(val.Expiry.Value - HeartbeatTtl)
                : DateTimeOffset.UtcNow;
            results.Add(new PresenceDto(id, status, lastSeen));
        }
        return results;
    }

    // ── Typing indicators ─────────────────────────────────────────────────────

    public async Task SetTypingAsync(Guid userId, Guid conversationId, bool isTyping, CancellationToken ct)
    {
        string key = $"typing:{conversationId}";
        string member = userId.ToString();

        if (isTyping)
        {
            await Db.SetAddAsync(key, member);
            await Db.KeyExpireAsync(key, TypingTtl);
            await rt.PublishAsync($"conversation:{conversationId}", "typing:start",
                new { userId, conversationId }, ct);
        }
        else
        {
            await Db.SetRemoveAsync(key, member);
            await rt.PublishAsync($"conversation:{conversationId}", "typing:stop",
                new { userId, conversationId }, ct);
        }
    }
}
