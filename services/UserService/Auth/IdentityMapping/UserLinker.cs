using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace UserService.Auth.IdentityMapping;

public sealed class UserLinker : IUserLinker
{
    private readonly IExternalLoginLinkStore _store;
    private readonly ILogger<UserLinker> _logger;

    // Per-external-identity locks to avoid race on first sign-in
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public UserLinker(IExternalLoginLinkStore store, ILogger<UserLinker> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task<Guid> LinkOrGetUserIdAsync(
        string provider,
        string providerKey,
        Func<CancellationToken, Task<Guid>> createUser,
        CancellationToken ct = default)
    {
        Guid? existing = await _store.TryGetUserIdAsync(provider, providerKey, ct);
        if (existing.HasValue) return existing.Value;

        string key = $"{provider}|{providerKey}";
        SemaphoreSlim gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            // Re-check after entering the lock
            existing = await _store.TryGetUserIdAsync(provider, providerKey, ct);
            if (existing.HasValue) return existing.Value;

            Guid userId = await createUser(ct);
            await _store.LinkAsync(provider, providerKey, userId, ct);
            _logger.LogInformation("Linked external {Provider}:{ProviderKey} -> User {UserId}", provider, providerKey, userId);
            return userId;
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(key, out _);
        }
    }
}
