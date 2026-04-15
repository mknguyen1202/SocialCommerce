using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using AuthorizationService.Bff; // for AppUser & SessionRecord used by controllers/BFF
using AuthorizationService.Infrastructure.Persistence; // AppDbContext
using Entities = AuthorizationService.Infrastructure.Persistence.Entities;

namespace AuthorizationService.Sessions;

/// <summary>
/// Contract used by Controllers/BFF.
/// </summary>
public interface ISessionStore
{
    Task<string> CreateAsync(SessionCreateRequest req, CancellationToken ct = default);
    Task<SessionRecord?> GetAsync(string handle, CancellationToken ct = default);
    Task<bool> TouchAsync(string handle, CancellationToken ct = default);
    Task DeleteAsync(string handle, CancellationToken ct = default);

    // Token ops (useful for refresh flows)
    Task UpsertProviderTokensAsync(string handle, ProviderTokenRecord tokens, CancellationToken ct = default);
    Task<ProviderTokenRecord?> GetProviderTokensAsync(string handle, string provider, CancellationToken ct = default);
}

/// <summary>Input when creating a session.</summary>
public sealed class SessionCreateRequest
{
    public required AppUser User { get; init; }
    public required IEnumerable<Claim> Claims { get; init; }
    public required ProviderTokenRecord ProviderTokens { get; init; }
}

/// <summary>Server-side record of provider tokens stored with the session (encrypted at rest).</summary>
public sealed class ProviderTokenRecord
{
    public required string Provider { get; init; }             // "google", "microsoft", etc.
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }
    public string? IdToken { get; init; }
    public DateTimeOffset ExpiresAtUtc { get; init; }
    public string? Scopes { get; init; }
}

/// <summary>
/// In-memory implementation (great for local dev).
/// </summary>
public sealed class InMemorySessionStore : ISessionStore
{
    private readonly SessionCookieOptions _opt;
    private readonly ITokenProtector _protector;

    private sealed class MemoryEntry
    {
        public required AppUser User { get; init; }
        public required List<Claim> Claims { get; init; }
        public required Dictionary<string, string> ProtectedTokensByProvider { get; init; }
        public DateTimeOffset CreatedAtUtc { get; init; }
        public DateTimeOffset LastSeenUtc { get; set; }
        public DateTimeOffset? AbsoluteExpiryUtc { get; init; }
    }

    private readonly ConcurrentDictionary<string, MemoryEntry> _store = new(StringComparer.Ordinal);
    private static readonly TimeSpan Skew = TimeSpan.FromMinutes(1);

    public InMemorySessionStore(IOptions<SessionCookieOptions> opt, ITokenProtector protector)
    {
        _opt = opt.Value;
        _protector = protector;
    }

    public Task<string> CreateAsync(SessionCreateRequest req, CancellationToken ct = default)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        string handle = CreateHandle();

        DateTimeOffset? abs = _opt.AbsoluteLifetimeDays > 0 ? now.AddDays(_opt.AbsoluteLifetimeDays) : (DateTimeOffset?)null;

        MemoryEntry entry = new MemoryEntry
        {
            User = req.User,
            Claims = req.Claims.ToList(),
            ProtectedTokensByProvider = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
            CreatedAtUtc = now,
            LastSeenUtc = now,
            AbsoluteExpiryUtc = abs
        };

        entry.ProtectedTokensByProvider[req.ProviderTokens.Provider] = _protector.Protect(req.ProviderTokens);
        _store[handle] = entry;

        return Task.FromResult(handle);
    }

    public Task<SessionRecord?> GetAsync(string handle, CancellationToken ct = default)
    {
        if (!_store.TryGetValue(handle, out MemoryEntry? e)) return Task.FromResult<SessionRecord?>(null);

        if (IsExpired(e)) { _store.TryRemove(handle, out _); return Task.FromResult<SessionRecord?>(null); }

        // sliding idle
        e.LastSeenUtc = DateTimeOffset.UtcNow;

        SessionRecord record = new SessionRecord(
            Id: handle,
            User: e.User,
            Claims: e.Claims
        );
        return Task.FromResult<SessionRecord?>(record);
    }

    public Task<bool> TouchAsync(string handle, CancellationToken ct = default)
    {
        if (!_store.TryGetValue(handle, out MemoryEntry? e)) return Task.FromResult(false);
        if (IsExpired(e)) { _store.TryRemove(handle, out _); return Task.FromResult(false); }
        e.LastSeenUtc = DateTimeOffset.UtcNow;
        return Task.FromResult(true);
    }

    public Task DeleteAsync(string handle, CancellationToken ct = default)
    {
        _store.TryRemove(handle, out _);
        return Task.CompletedTask;
    }

    public Task UpsertProviderTokensAsync(string handle, ProviderTokenRecord tokens, CancellationToken ct = default)
    {
        if (_store.TryGetValue(handle, out MemoryEntry? e))
            e.ProtectedTokensByProvider[tokens.Provider] = _protector.Protect(tokens);
        return Task.CompletedTask;
    }

    public Task<ProviderTokenRecord?> GetProviderTokensAsync(string handle, string provider, CancellationToken ct = default)
    {
        if (_store.TryGetValue(handle, out MemoryEntry? e) && e.ProtectedTokensByProvider.TryGetValue(provider, out string? enc))
            return Task.FromResult<ProviderTokenRecord?>(_protector.Unprotect(enc));

        return Task.FromResult<ProviderTokenRecord?>(null);
    }

    private bool IsExpired(MemoryEntry e)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (e.AbsoluteExpiryUtc is { } abs && now > abs) return true;
        if (_opt.IdleTimeoutMinutes > 0 && now > e.LastSeenUtc.AddMinutes(_opt.IdleTimeoutMinutes).Add(Skew))
            return true;
        return false;
    }

    private static string CreateHandle()
        => Convert.ToBase64String(Guid.NewGuid().ToByteArray())
           .TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

/// <summary>
/// EF Core implementation (production-ready skeleton).
/// Assumes your AppDbContext exposes DbSets for Session, StoredToken, and User entities
/// under AuthorizationService.Infrastructure.Persistence.Entities namespace.
/// Adjust property names/mappings to your actual entities.
/// </summary>
public sealed class EfCoreSessionStore : ISessionStore
{
    private readonly AppDbContext _db;
    private readonly SessionCookieOptions _opt;
    private readonly ITokenProtector _protector;

    public EfCoreSessionStore(AppDbContext db, IOptions<SessionCookieOptions> opt, ITokenProtector protector)
    {
        _db = db;
        _opt = opt.Value;
        _protector = protector;
    }

    public async Task<string> CreateAsync(SessionCreateRequest req, CancellationToken ct = default)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        string handle = CreateHandle();
        DateTimeOffset? abs = _opt.AbsoluteLifetimeDays > 0 ? now.AddDays(_opt.AbsoluteLifetimeDays) : (DateTimeOffset?)null;

        // Ensure user exists (simple upsert on Id/email/name/picture)
        Entities.User? user = await _db.Set<Entities.User>()
            .FirstOrDefaultAsync(u => u.Id == req.User.Id, ct);

        if (user is null)
        {
            user = new Entities.User
            {
                Id = req.User.Id,
                Email = req.User.Email,
                Name = req.User.Name,
                Picture = req.User.Picture
            };
            _db.Add(user);
        }
        else
        {
            // Optional: update user info on login
            user.Email = req.User.Email ?? user.Email;
            user.Name = req.User.Name ?? user.Name;
            user.Picture = req.User.Picture ?? user.Picture;
        }

        Entities.Session session = new Entities.Session
        {
            Id = handle,
            UserId = user.Id,
            CreatedAtUtc = now,
            LastSeenUtc = now,
            AbsoluteExpiryUtc = abs,
            // Store claims as JSON; alternatively use a join table if you prefer.
            ClaimsJson = SerializeClaims(req.Claims)
        };
        _db.Add(session);

        string protectedTokens = _protector.Protect(req.ProviderTokens);
        Entities.StoredToken token = new Entities.StoredToken
        {
            Id = Guid.NewGuid().ToString("n"),
            SessionId = session.Id,
            Provider = req.ProviderTokens.Provider,
            ProtectedPayload = protectedTokens,
            ExpiresAtUtc = req.ProviderTokens.ExpiresAtUtc,
            Scopes = req.ProviderTokens.Scopes
        };
        _db.Add(token);

        await _db.SaveChangesAsync(ct);
        return handle;
    }

    public async Task<SessionRecord?> GetAsync(string handle, CancellationToken ct = default)
    {
        Entities.Session? s = await _db.Set<Entities.Session>()
            .AsTracking()
            .FirstOrDefaultAsync(x => x.Id == handle, ct);

        if (s is null) return null;

        if (IsExpired(s))
        {
            // Hard-expired: delete
            _db.Remove(s);
            await _db.SaveChangesAsync(ct);
            return null;
        }

        // Sliding idle timeout
        s.LastSeenUtc = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        // Build claims from stored JSON (or from your user/roles tables if you prefer)
        List<Claim> claims = DeserializeClaims(s.ClaimsJson);

        // Load minimal user
        Entities.User u = await _db.Set<Entities.User>()
            .AsNoTracking()
            .FirstAsync(x => x.Id == s.UserId, ct);

        SessionRecord record = new SessionRecord(
            Id: s.Id,
            User: new AppUser(u.Id, u.Email, u.Name, u.Picture),
            Claims: claims
        );
        return record;
    }

    public async Task<bool> TouchAsync(string handle, CancellationToken ct = default)
    {
        Entities.Session? s = await _db.Set<Entities.Session>().FirstOrDefaultAsync(x => x.Id == handle, ct);
        if (s is null) return false;

        if (IsExpired(s))
        {
            _db.Remove(s);
            await _db.SaveChangesAsync(ct);
            return false;
        }

        s.LastSeenUtc = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task DeleteAsync(string handle, CancellationToken ct = default)
    {
        Entities.Session? s = await _db.Set<Entities.Session>().FirstOrDefaultAsync(x => x.Id == handle, ct);
        if (s is null) return;

        // Cascade delete tokens if not configured on model
        List<Entities.StoredToken> tokens = await _db.Set<Entities.StoredToken>()
            .Where(t => t.SessionId == handle)
            .ToListAsync(ct);

        _db.RemoveRange(tokens);
        _db.Remove(s);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpsertProviderTokensAsync(string handle, ProviderTokenRecord tokens, CancellationToken ct = default)
    {
        Entities.Session? s = await _db.Set<Entities.Session>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == handle, ct);
        if (s is null) throw new KeyNotFoundException("Session not found.");

        Entities.StoredToken? existing = await _db.Set<Entities.StoredToken>()
            .FirstOrDefaultAsync(t => t.SessionId == handle && t.Provider == tokens.Provider, ct);

        string protectedPayload = _protector.Protect(tokens);

        if (existing is null)
        {
            Entities.StoredToken token = new Entities.StoredToken
            {
                Id = Guid.NewGuid().ToString("n"),
                SessionId = handle,
                Provider = tokens.Provider,
                ProtectedPayload = protectedPayload,
                ExpiresAtUtc = tokens.ExpiresAtUtc,
                Scopes = tokens.Scopes
            };
            _db.Add(token);
        }
        else
        {
            existing.ProtectedPayload = protectedPayload;
            existing.ExpiresAtUtc = tokens.ExpiresAtUtc;
            existing.Scopes = tokens.Scopes;
            _db.Update(existing);
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<ProviderTokenRecord?> GetProviderTokensAsync(string handle, string provider, CancellationToken ct = default)
    {
        Entities.StoredToken? row = await _db.Set<Entities.StoredToken>()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.SessionId == handle && t.Provider == provider, ct);

        if (row is null) return null;
        return _protector.Unprotect(row.ProtectedPayload);
    }

    private bool IsExpired(Entities.Session s)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (s.AbsoluteExpiryUtc is { } abs && now > abs) return true;
        if (_opt.IdleTimeoutMinutes > 0 && now > s.LastSeenUtc.AddMinutes(_opt.IdleTimeoutMinutes))
            return true;
        return false;
    }

    private static string SerializeClaims(IEnumerable<Claim> claims)
        => System.Text.Json.JsonSerializer.Serialize(
            claims.Select(c => new ClaimDto { Type = c.Type, Value = c.Value }),
            new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));

    private static List<Claim> DeserializeClaims(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        List<ClaimDto>? arr = System.Text.Json.JsonSerializer.Deserialize<List<ClaimDto>>(json,
            new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)) ?? new();
        return arr.Select(c => new Claim(c.Type, c.Value)).ToList();
    }

    private static string CreateHandle()
        => Convert.ToBase64String(Guid.NewGuid().ToByteArray())
           .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed class ClaimDto { public string Type { get; set; } = ""; public string Value { get; set; } = ""; }
}
