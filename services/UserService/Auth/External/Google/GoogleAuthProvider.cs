using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;
using UserService.Auth.Abstractions;
using UserService.Auth.Bff;                 // CookieSchemes
using UserService.Auth.External.Core;

namespace UserService.Auth.External.Google;

public sealed class GoogleAuthProvider : IExternalAuthProvider
{
    public string Name => "Google";

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

        string? email = p.FindFirst(ClaimTypes.Email)?.Value ?? p.FindFirst("email")?.Value;
        string? name = p.FindFirst(ClaimTypes.Name)?.Value ?? p.FindFirst("name")?.Value;
        string? picture = p.FindFirst("picture")?.Value;

        Dictionary<string, string> raw = p.Claims.GroupBy(c => c.Type).ToDictionary(g => g.Key, g => g.First().Value);

        return new ExternalUserInfo("Google", id, email, name, picture, raw);
    }
}
