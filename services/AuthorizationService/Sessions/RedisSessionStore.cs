using AuthorizationService.Bff;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Json;

namespace AuthorizationService.Sessions;

public sealed class RedisSessionStore : ISessionStore
{
    private readonly IDistributedCache _cache;
    private readonly SessionCookieOptions _opt;
    private readonly ITokenProtector _protector;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private static readonly DistributedCacheEntryOptions NoExp = new();

    public RedisSessionStore(
        IDistributedCache cache,
        IOptions<SessionCookieOptions> opt,
        ITokenProtector protector)
    {
        _cache = cache;
        _opt = opt.Value;       // IdleTimeoutMinutes, AbsoluteLifetimeDays, etc.
        _protector = protector; // encrypts/decrypts ProviderTokenRecord
    }

    public async Task<string> CreateAsync(SessionCreateRequest req, CancellationToken ct = default)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        string handle = CreateHandle();
        DateTimeOffset? abs = _opt.AbsoluteLifetimeDays > 0 ? now.AddDays(_opt.AbsoluteLifetimeDays) : (DateTimeOffset?)null;

        RedisEntry entry = new RedisEntry(
            req.User,
            req.Claims.Select(c => new ClaimDto(c.Type, c.Value)).ToList(),
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [req.ProviderTokens.Provider] = _protector.Protect(req.ProviderTokens)
            },
            now,
            abs
        );

        await SetAsync(handle, entry, ct);
        return handle;
    }

    public async Task<SessionRecord?> GetAsync(string handle, CancellationToken ct = default)
    {
        (RedisEntry? entry, byte[]? raw) = await TryGetAsync(handle, ct);
        if (entry is null) return null;

        if (IsAbsoluteExpired(entry))
        {
            await _cache.RemoveAsync(Key(handle), ct);
            return null;
        }

        // Sliding idle: bump TTL (IDistributedCache.RefreshAsync resets sliding expiration)
        await RefreshAsync(handle, ct);

        List<Claim> claims = entry.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();
        return new SessionRecord(handle, entry.User, claims);
    }

    public async Task<bool> TouchAsync(string handle, CancellationToken ct = default)
    {
        (RedisEntry? entry, byte[]? raw) = await TryGetAsync(handle, ct);
        if (entry is null) return false;
        if (IsAbsoluteExpired(entry))
        {
            await _cache.RemoveAsync(Key(handle), ct);
            return false;
        }
        await RefreshAsync(handle, ct);
        return true;
    }

    public Task DeleteAsync(string handle, CancellationToken ct = default)
        => _cache.RemoveAsync(Key(handle), ct);

    public async Task UpsertProviderTokensAsync(string handle, ProviderTokenRecord tokens, CancellationToken ct = default)
    {
        (RedisEntry? entry, byte[]? raw) = await TryGetAsync(handle, ct);
        if (entry is null) throw new KeyNotFoundException("Session not found.");

        entry.ProtectedTokensByProvider[tokens.Provider] = _protector.Protect(tokens);
        await SetAsync(handle, entry, ct); // also resets sliding TTL
    }

    public async Task<ProviderTokenRecord?> GetProviderTokensAsync(string handle, string provider, CancellationToken ct = default)
    {
        (RedisEntry? entry, byte[]? raw) = await TryGetAsync(handle, ct);
        if (entry is null) return null;
        if (!entry.ProtectedTokensByProvider.TryGetValue(provider, out string? enc)) return null;
        return _protector.Unprotect(enc);
    }

    // ----- helpers -----

    private async Task<(RedisEntry? entry, byte[]? raw)> TryGetAsync(string handle, CancellationToken ct)
    {
        byte[]? raw = await _cache.GetAsync(Key(handle), ct);
        if (raw is null) return (null, null);
        RedisEntry? entry = JsonSerializer.Deserialize<RedisEntry>(raw, _json);
        return (entry, raw);
    }

    private Task RefreshAsync(string handle, CancellationToken ct)
        => _opt.IdleTimeoutMinutes > 0
           ? _cache.RefreshAsync(Key(handle), ct) // extends sliding TTL
           : Task.CompletedTask;

    private Task SetAsync(string handle, RedisEntry entry, CancellationToken ct)
    {
        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(entry, _json);
        DistributedCacheEntryOptions options = _opt.IdleTimeoutMinutes > 0
            ? new DistributedCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(_opt.IdleTimeoutMinutes) }
            : NoExp;
        return _cache.SetAsync(Key(handle), bytes, options, ct);
    }

    private static string Key(string handle) => $"sess:{handle}";

    private static string CreateHandle()
        => Convert.ToBase64String(Guid.NewGuid().ToByteArray())
           .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private bool IsAbsoluteExpired(RedisEntry e)
        => e.AbsoluteExpiryUtc is { } abs && DateTimeOffset.UtcNow > abs;

    private sealed record RedisEntry
    (
        AppUser User,
        List<ClaimDto> Claims,
        Dictionary<string, string> ProtectedTokensByProvider,
        DateTimeOffset CreatedAtUtc,
        DateTimeOffset? AbsoluteExpiryUtc
    );

    private sealed record ClaimDto(string Type, string Value);
}
