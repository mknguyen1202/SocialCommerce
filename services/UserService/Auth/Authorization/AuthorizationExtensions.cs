using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using UserService.Auth.Authorization.Handlers;
using UserService.Auth.Authorization.Requirements;

namespace UserService.Auth.Authorization;

public static class AuthorizationExtensions
{
    /// <summary>
    /// Adds common policies and the permission handler.
    /// </summary>
    public static IServiceCollection AddAuthorizationWithPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, PermissionHandler>();

        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyNames.UserRead, p => p.AddRequirements(new PermissionRequirement(PolicyNames.UserRead)));
            options.AddPolicy(PolicyNames.UserWrite, p => p.AddRequirements(new PermissionRequirement(PolicyNames.UserWrite)));

            options.AddPolicy(PolicyNames.OrdersRead, p => p.AddRequirements(new PermissionRequirement(PolicyNames.OrdersRead)));
            options.AddPolicy(PolicyNames.OrdersWrite, p => p.AddRequirements(new PermissionRequirement(PolicyNames.OrdersWrite)));

            options.AddPolicy(PolicyNames.AdminOnly, p => p.RequireRole("Admin"));
        });

        return services;
    }
}
