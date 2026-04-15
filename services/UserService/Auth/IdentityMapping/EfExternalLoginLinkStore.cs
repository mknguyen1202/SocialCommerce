using Microsoft.EntityFrameworkCore;
using UserService.Data;

namespace UserService.Auth.IdentityMapping;

/// <summary>
/// EF Core-backed store for external login links (provider + providerKey → local UserId).
/// </summary>
public sealed class EfExternalLoginLinkStore : IExternalLoginLinkStore
{
    private readonly AppDbContext _db;

    public EfExternalLoginLinkStore(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Guid?> TryGetUserIdAsync(string provider, string providerKey, CancellationToken ct = default)
    {
        ExternalLoginLink? link = await _db.ExternalLoginLinks
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Provider == provider && l.ProviderKey == providerKey, ct);

        return link?.UserId;
    }

    public async Task LinkAsync(string provider, string providerKey, Guid userId, CancellationToken ct = default)
    {
        ExternalLoginLink link = new()
        {
            Provider = provider,
            ProviderKey = providerKey,
            UserId = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ExternalLoginLinks.Add(link);
        await _db.SaveChangesAsync(ct);
    }
}
