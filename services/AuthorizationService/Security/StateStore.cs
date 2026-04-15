using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace AuthorizationService.Security;

/// <summary>Data saved before redirecting to provider; consumed at callback.</summary>
public sealed class AuthStateRecord
{
    public string Provider { get; set; } = default!;
    public string CodeVerifier { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string ReturnUrl { get; set; } = "/";
    public DateTimeOffset CreatedUtc { get; set; }
}

public interface IStateStore
{
    Task SaveAsync(string state, AuthStateRecord record, CancellationToken ct = default);
    /// <summary>One-time read; removes the entry if present and not expired.</summary>
    Task<AuthStateRecord?> TakeAsync(string state, CancellationToken ct = default);
    Task DeleteAsync(string state, CancellationToken ct = default);
}

/// <summary>In-memory TTL store; great for dev.</summary>
public sealed class InMemoryStateStore : IStateStore
{
    private readonly SecurityOptions _opt;
    private readonly ConcurrentDictionary<string, Entry> _map = new(StringComparer.Ordinal);
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private sealed class Entry
    {
        public string Json { get; init; } = default!;
        public DateTimeOffset Exp { get; init; }
    }

    public InMemoryStateStore(IOptions<SecurityOptions> opt) => _opt = opt.Value;

    public Task SaveAsync(string state, AuthStateRecord record, CancellationToken ct = default)
    {
        var ttl = TimeSpan.FromMinutes(Math.Max(1, _opt.StateTtlMinutes));
        var json = JsonSerializer.Serialize(record, _json);
        _map[state] = new Entry { Json = json, Exp = DateTimeOffset.UtcNow.Add(ttl) };
        return Task.CompletedTask;
    }

    public Task<AuthStateRecord?> TakeAsync(string state, CancellationToken ct = default)
    {
        if (_map.TryRemove(state, out var e))
        {
            if (DateTimeOffset.UtcNow <= e.Exp)
                return Task.FromResult(JsonSerializer.Deserialize<AuthStateRecord>(e.Json, _json));
        }
        return Task.FromResult<AuthStateRecord?>(null);
    }

    public Task DeleteAsync(string state, CancellationToken ct = default)
    {
        _map.TryRemove(state, out _);
        return Task.CompletedTask;
    }
}

/// <summary>Distributed cache implementation (Redis, SQL Server, MemoryDistributedCache, etc.).</summary>
public sealed class DistributedStateStore : IStateStore
{
    private readonly IDistributedCache _cache;
    private readonly SecurityOptions _opt;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private const string Prefix = "authstate:";

    public DistributedStateStore(IDistributedCache cache, IOptions<SecurityOptions> opt)
    {
        _cache = cache;
        _opt = opt.Value;
    }

    public async Task SaveAsync(string state, AuthStateRecord record, CancellationToken ct = default)
    {
        var key = Prefix + state;
        var value = JsonSerializer.SerializeToUtf8Bytes(record, _json);
        var ttl = TimeSpan.FromMinutes(Math.Max(1, _opt.StateTtlMinutes));
        await _cache.SetAsync(key, value, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        }, ct);
    }

    public async Task<AuthStateRecord?> TakeAsync(string state, CancellationToken ct = default)
    {
        var key = Prefix + state;
        var bytes = await _cache.GetAsync(key, ct);
        if (bytes is null) return null;

        // one-time read: delete immediately
        await _cache.RemoveAsync(key, ct);

        return JsonSerializer.Deserialize<AuthStateRecord>(bytes, _json);
    }

    public Task DeleteAsync(string state, CancellationToken ct = default)
        => _cache.RemoveAsync(Prefix + state, ct);
}
