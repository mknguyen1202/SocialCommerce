namespace UserService.Auth.IdentityMapping;

/// <summary>
/// Maps an external identity (Provider + ProviderKey) to a local UserId.
/// </summary>
public sealed class ExternalLoginLink
{
    public string Provider { get; init; } = default!;     // "Google" | "Facebook" | "Apple"
    public string ProviderKey { get; init; } = default!;  // external subject/id
    public Guid UserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Abstract store you can back with EF Core.</summary>
public interface IExternalLoginLinkStore
{
    Task<Guid?> TryGetUserIdAsync(string provider, string providerKey, CancellationToken ct = default);
    Task LinkAsync(string provider, string providerKey, Guid userId, CancellationToken ct = default);
}
