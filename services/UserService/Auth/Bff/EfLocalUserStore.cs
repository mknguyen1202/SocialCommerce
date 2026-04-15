using Microsoft.EntityFrameworkCore;
using UserService.Auth.IdentityMapping;
using UserService.Data;

namespace UserService.Auth.Bff;

/// <summary>
/// EF Core-backed implementation of <see cref="ILocalUserStore"/>.
/// Uses <see cref="IUserLinker"/> for concurrency-safe "find or create" linking,
/// then resolves the local <see cref="UserProfile"/> for the linked user.
/// </summary>
public sealed class EfLocalUserStore : ILocalUserStore
{
    private readonly AppDbContext _db;
    private readonly IUserLinker _linker;

    public EfLocalUserStore(AppDbContext db, IUserLinker linker)
    {
        _db = db;
        _linker = linker;
    }

    public async Task<LocalUser> FindOrCreateExternalUserAsync(
        string provider, string providerKey, string? email, string name)
    {
        Guid userId = await _linker.LinkOrGetUserIdAsync(
            provider,
            providerKey,
            async ct =>
            {
                // Check if a profile with this email already exists (link to existing account)
                UserProfile? existing = email is not null
                    ? await _db.UserProfiles.FirstOrDefaultAsync(p => p.Email == email, ct)
                    : null;

                if (existing is not null)
                    return existing.Id;

                // Create a brand-new profile
                UserProfile profile = new()
                {
                    IdentityId = $"{provider}|{providerKey}",
                    DisplayName = name,
                    Email = email,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                _db.UserProfiles.Add(profile);
                await _db.SaveChangesAsync(ct);

                return profile.Id;
            });

        UserProfile? user = await _db.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == userId);

        // Should never be null at this point, but guard defensively
        return new LocalUser(
            user?.Id ?? userId,
            user?.DisplayName ?? name,
            user?.Email ?? email);
    }
}
