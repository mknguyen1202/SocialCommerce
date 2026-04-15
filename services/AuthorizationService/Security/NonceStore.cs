using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace AuthorizationService.Security;

public interface INonceStore
{
    Task SaveAsync(string nonce, TimeSpan? ttl = null, CancellationToken ct = default);
    /// <summary>Consume a nonce if present; returns true if it existed and was valid.</summary>
    Task<bool> TakeAsync(string nonce, CancellationToken ct = default);
}

public sealed class InMemoryNonceStore : INonceStore
{
    private readonly SecurityOptions _opt;
    private readonly ConcurrentDictionary<string, DateTimeOffset> _expiries = new(StringComparer.Ordinal);

    public InMemoryNonceStore(IOptions<SecurityOptions> opt) => _opt = opt.Value;

    public Task SaveAsync(string nonce, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        var life = ttl ?? TimeSpan.FromMinutes(Math.Max(1, _opt.NonceTtlMinutes));
        _expiries[nonce] = DateTimeOffset.UtcNow.Add(life);
        return Task.CompletedTask;
    }

    public Task<bool> TakeAsync(string nonce, CancellationToken ct = default)
    {
        if (_expiries.TryRemove(nonce, out var exp))
            return Task.FromResult(DateTimeOffset.UtcNow <= exp);
        return Task.FromResult(false);
    }
}

public sealed class DistributedNonceStore : INonceStore
{
    private readonly IDistributedCache _cache;
    private readonly SecurityOptions _opt;
    private const string Prefix = "nonce:";

    public DistributedNonceStore(IDistributedCache cache, IOptions<SecurityOptions> opt)
    {
        _cache = cache;
        _opt = opt.Value;
    }

    public Task SaveAsync(string nonce, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        var life = ttl ?? TimeSpan.FromMinutes(Math.Max(1, _opt.NonceTtlMinutes));
        return _cache.SetStringAsync(Prefix + nonce, "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = life }, ct);
    }

    public async Task<bool> TakeAsync(string nonce, CancellationToken ct = default)
    {
        var key = Prefix + nonce;
        var val = await _cache.GetStringAsync(key, ct);
        if (val is null) return false;
        await _cache.RemoveAsync(key, ct); // one-time use
        return true;
    }
}
