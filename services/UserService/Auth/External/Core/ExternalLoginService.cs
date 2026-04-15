using Microsoft.AspNetCore.Authentication;
using UserService.Auth.Abstractions;

namespace UserService.Auth.External.Core;

public sealed class ExternalLoginService
{
    private readonly IExternalAuthRegistry _registry;

    public ExternalLoginService(IExternalAuthRegistry registry)
    {
        _registry = registry;
    }

    /// <summary>
    /// Builds challenge properties and returns the auth scheme to challenge.
    /// Endpoint can: return Results.Challenge(props, new[] { scheme });
    /// </summary>
    public (AuthenticationProperties Props, string Scheme) StartChallenge(HttpContext ctx, string providerName, string callbackPath)
    {
        IExternalAuthProvider provider = _registry.Find(providerName)
            ?? throw new InvalidOperationException($"Unknown provider '{providerName}'. Available: {string.Join(", ", _registry.Names)}");

        AuthenticationProperties props = provider.BuildChallengeProperties(ctx, callbackPath);
        return (props, provider.Name);
    }

    /// <summary>
    /// Reads the external temp cookie (set by the handler) and normalizes to ExternalUserInfo.
    /// </summary>
    public Task<ExternalUserInfo?> HandleCallbackAsync(HttpContext ctx, string providerName)
    {
        IExternalAuthProvider provider = _registry.Find(providerName)
            ?? throw new InvalidOperationException($"Unknown provider '{providerName}'.");
        return provider.HandleCallbackAsync(ctx);
    }
}
