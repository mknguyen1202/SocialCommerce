using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
//using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using UserService.Auth.Abstractions;
using UserService.Auth.Bff;
using UserService.Auth.External.Core;

namespace UserService.Auth.External.Apple;

public sealed class AppleAuthProvider : IExternalAuthProvider
{
    private readonly AppleOptions _opt;

    public AppleAuthProvider(AppleOptions opt) => _opt = opt;

    public string Name => "Apple";

    public AuthenticationProperties BuildChallengeProperties(HttpContext ctx, string callbackPath)
        => new AuthenticationProperties { RedirectUri = callbackPath };

    public async Task<ExternalUserInfo?> HandleCallbackAsync(HttpContext ctx)
    {
        AuthenticateResult result = await ctx.AuthenticateAsync(CookieSchemes.External);
        if (!result.Succeeded || result.Principal is null) return null;

        ClaimsPrincipal p = result.Principal;

        string? id = p.FindFirst("sub")?.Value
              ?? p.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(id)) return null;

        // Apple may return private relay; email might be absent on later logins.
        string? email = p.FindFirst(ClaimTypes.Email)?.Value ?? p.FindFirst("email")?.Value;
        string? name = p.FindFirst(ClaimTypes.Name)?.Value;

        Dictionary<string, string> raw = p.Claims.GroupBy(c => c.Type).ToDictionary(g => g.Key, g => g.First().Value);

        return new ExternalUserInfo("Apple", id, email, name, null, raw);
    }
}
