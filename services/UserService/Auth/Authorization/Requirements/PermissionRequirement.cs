using Microsoft.AspNetCore.Authorization;

namespace UserService.Auth.Authorization.Requirements;

/// <summary>
/// Requires at least one of the named permissions.
/// </summary>
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(params string[] permissions)
    {
        if (permissions is null || permissions.Length == 0)
            throw new ArgumentException("At least one permission is required.", nameof(permissions));

        Permissions = permissions.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public IReadOnlyList<string> Permissions { get; }
}
