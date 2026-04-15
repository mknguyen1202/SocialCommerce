using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using UserService.Auth.Authorization.Requirements;
using UserService.Auth.Abstractions; // IPermissionResolver (from your Abstractions folder)

namespace UserService.Auth.Authorization.Handlers;

/// <summary>
/// Succeeds if the user already carries any required permission claim,
/// or if an <see cref="IPermissionResolver"/> says the user has it in the DB.
/// </summary>
public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly ILogger<PermissionHandler> _logger;
    private readonly IPermissionResolver? _resolver;

    public const string PermissionClaimType = "permission";

    public PermissionHandler(ILogger<PermissionHandler> logger, IPermissionResolver? resolver = null)
    {
        _logger = logger;
        _resolver = resolver; // optional: if null, only claim-based check is performed
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        ClaimsPrincipal? user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
            return;

        // 1) Check permissions present as claims (fast path)
        HashSet<string> claimValues = user.FindAll(PermissionClaimType).Select(c => c.Value).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (requirement.Permissions.Any(p => claimValues.Contains(p)))
        {
            context.Succeed(requirement);
            return;
        }

        // 2) If not present, optionally consult DB via IPermissionResolver
        if (_resolver is not null)
        {
            string? uid = user.FindFirstValue("uid");
            if (Guid.TryParse(uid, out Guid userId))
            {
                try
                {
                    (IEnumerable<string> _, IEnumerable<string> perms) = await _resolver.GetForUserAsync(userId);
                    HashSet<string> set = perms.ToHashSet(StringComparer.OrdinalIgnoreCase);
                    if (requirement.Permissions.Any(p => set.Contains(p)))
                    {
                        context.Succeed(requirement);
                        return;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Permission resolution failed for user {UserId}", uid);
                }
            }
        }

        // no success -> framework will treat as forbidden
    }
}
