using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging.Abstractions;
using UserService.Auth.Authorization.Handlers;
using UserService.Auth.Authorization.Requirements;
using Xunit;

namespace UserService.Tests.Unit;

public class PermissionHandlerTests
{
    private static PermissionHandler MakeHandler() =>
        new PermissionHandler(NullLogger<PermissionHandler>.Instance, resolver: null);

    private static AuthorizationHandlerContext MakeContext(
        PermissionRequirement requirement,
        IEnumerable<Claim>? claims = null,
        bool authenticated = true)
    {
        ClaimsIdentity identity = authenticated
            ? new ClaimsIdentity(claims ?? Enumerable.Empty<Claim>(), "Test")
            : new ClaimsIdentity();
        ClaimsPrincipal user = new ClaimsPrincipal(identity);
        return new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);
    }

    [Fact]
    public async Task AuthenticatedUser_WithMatchingPermissionClaim_Succeeds()
    {
        PermissionRequirement requirement = new PermissionRequirement("user.read");
        AuthorizationHandlerContext context = MakeContext(
            requirement,
            claims: new[] { new Claim(PermissionHandler.PermissionClaimType, "user.read") });

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeTrue();
    }

    [Fact]
    public async Task AuthenticatedUser_WithoutMatchingPermissionClaim_DoesNotSucceed()
    {
        PermissionRequirement requirement = new PermissionRequirement("user.write");
        AuthorizationHandlerContext context = MakeContext(
            requirement,
            claims: new[] { new Claim(PermissionHandler.PermissionClaimType, "user.read") });

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task UnauthenticatedUser_DoesNotSucceed()
    {
        PermissionRequirement requirement = new PermissionRequirement("user.read");
        AuthorizationHandlerContext context = MakeContext(requirement, authenticated: false);

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task AuthenticatedUser_WithAnyOneOfRequiredPermissions_Succeeds()
    {
        PermissionRequirement requirement = new PermissionRequirement("user.read", "user.write");
        AuthorizationHandlerContext context = MakeContext(
            requirement,
            claims: new[] { new Claim(PermissionHandler.PermissionClaimType, "user.write") });

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeTrue();
    }

    [Fact]
    public async Task PermissionComparison_IsCaseInsensitive()
    {
        PermissionRequirement requirement = new PermissionRequirement("User.Read");
        AuthorizationHandlerContext context = MakeContext(
            requirement,
            claims: new[] { new Claim(PermissionHandler.PermissionClaimType, "user.read") });

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeTrue();
    }

    [Fact]
    public async Task AuthenticatedUser_WithNoClaims_DoesNotSucceed()
    {
        PermissionRequirement requirement = new PermissionRequirement("user.read");
        AuthorizationHandlerContext context = MakeContext(requirement, claims: Enumerable.Empty<Claim>());

        await MakeHandler().HandleAsync(context);

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public void PermissionRequirement_Throws_WhenNoPermissionsProvided()
    {
        Action act = () => new PermissionRequirement();

        act.Should().Throw<ArgumentException>();
    }
}
