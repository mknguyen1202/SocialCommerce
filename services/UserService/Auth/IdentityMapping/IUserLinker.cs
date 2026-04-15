namespace UserService.Auth.IdentityMapping;

/// <summary>
/// Orchestrates "find or create" linking from an external identity
/// to a local UserId. Creation is delegated via the provided factory.
/// </summary>
public interface IUserLinker
{
    /// <summary>
    /// Returns local UserId for (provider, providerKey). If not found,
    /// invokes <paramref name="createUser"/> to create a user, then links and returns its id.
    /// </summary>
    Task<Guid> LinkOrGetUserIdAsync(
        string provider,
        string providerKey,
        Func<CancellationToken, Task<Guid>> createUser,
        CancellationToken ct = default);
}
