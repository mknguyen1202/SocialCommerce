using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using UserService.Auth.Abstractions;
using UserService.Auth.Bff.Csrf;
using UserService.Auth.External.Core;

namespace UserService.Auth.Bff;

public static class AuthEndpoints
{
    /// <summary>
    /// Maps BFF endpoints:
    /// <code>
    ///   GET  /auth/login/{provider} 
    ///   GET  /auth/callback/{provider}/signin
    ///   GET  /auth/me
    ///   POST /auth/logout
    /// </code>
    /// </summary>
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder g = app.MapGroup("/auth");

        // Start external login → 302 to provider
        g.MapGet("/login/{provider}", (string provider, HttpContext ctx, ExternalLoginService svc) =>
        {
            (AuthenticationProperties props, string scheme) = svc.StartChallenge(ctx, provider, $"/auth/callback/{provider}/signin");
            return Results.Challenge(props, new[] { scheme });
        });

        // Provider callback finalized by handler → temp external cookie exists →
        // create/link local user, issue App cookie, set CSRF, close popup.
        g.MapGet("/callback/{provider}/signin",
            async (string provider,
                   HttpContext ctx,
                   ExternalLoginService svc,
                   ILocalUserStore users,
                   ICsrfCookieWriter csrf) =>
            {
                ExternalUserInfo? ext = await svc.HandleCallbackAsync(ctx, provider);
                if (ext is null) return Results.Unauthorized();

                // 1) Map external identity -> local user
                LocalUser user = await users.FindOrCreateExternalUserAsync(ext.Provider, ext.ProviderKey, ext.Email, ext.Name ?? ext.Email ?? "User");

                // 2) Build app claims (add roles/permissions from your DB as needed)
                List<Claim> claims = new List<Claim>
                {
                    new("uid", user.Id.ToString()),
                    new(ClaimTypes.Name, user.Name),
                    new(ClaimTypes.Email, user.Email ?? string.Empty),
                    new("permission", "user.read")
                };
                // Add roles: claims.Add(new Claim(ClaimTypes.Role, "Admin"));

                // 3) Issue primary auth cookie
                ClaimsIdentity id = new ClaimsIdentity(claims, CookieSchemes.App);
                await ctx.SignInAsync(CookieSchemes.App, new ClaimsPrincipal(id));

                // 4) Cleanup external temp identity
                await ctx.SignOutAsync(CookieSchemes.External);

                // 5) Issue readable CSRF cookie
                csrf.Write(ctx);

                // 6) Close popup and notify opener
                return Results.Content(ClosePopupHtml, "text/html");
            });

        // Current user (hydrates SPA)
        g.MapGet("/me", (HttpContext ctx) =>
        {
            if (!ctx.User.Identity?.IsAuthenticated ?? true)
                return Results.Unauthorized();

            var me = new
            {
                id = ctx.User.FindFirstValue("uid"),
                name = ctx.User.FindFirstValue(ClaimTypes.Name),
                email = ctx.User.FindFirstValue(ClaimTypes.Email),
                roles = ctx.User.FindAll(ClaimTypes.Role).Select(r => r.Value).ToArray(),
                permissions = ctx.User.FindAll("permission").Select(p => p.Value).ToArray()
            };
            return Results.Ok(me);
        });

        // Logout requires CSRF (POST) and an authenticated user
        g.MapPost("/logout", [Authorize] async (HttpContext ctx, ICsrfCookieWriter csrf) =>
        {
            await ctx.SignOutAsync(CookieSchemes.App);
            csrf.Delete(ctx);
            return Results.NoContent();
        });

        // Returns the CSRF token in the response body so cross-origin SPAs can read it
        // (document.cookie can't read cookies set by a different domain).
        g.MapGet("/csrf", (HttpContext ctx, ICsrfCookieWriter csrf) =>
        {
            // Re-use existing cookie if present; otherwise write a fresh one.
            string token = ctx.Request.Cookies.TryGetValue(csrf.CookieName, out string? existing)
                           && !string.IsNullOrEmpty(existing)
                ? existing
                : csrf.Write(ctx);
            return Results.Ok(new { token });
        });

        // Issues a short-lived JWT for the SignalR hub (client uses ?access_token=)
        g.MapGet("/hub-token", (HttpContext ctx, ITokenService tokenSvc) =>
        {
            if (!ctx.User.Identity?.IsAuthenticated ?? true)
                return Results.Unauthorized();

            string? uid = ctx.User.FindFirstValue("uid");
            if (uid is null) return Results.Unauthorized();

            string token = tokenSvc.CreateToken(
                [new Claim("uid", uid)],
                expires: DateTimeOffset.UtcNow.AddMinutes(5)
            );
            return Results.Ok(new { token });
        }).RequireAuthorization();

        return app;
    }

    // Tiny page to close popup and notify SPA
    private const string ClosePopupHtml = """
<!doctype html><meta charset="utf-8">
<title>Signed in</title>
<script>
try { window.opener && window.opener.postMessage({ type: 'auth:success' }, '*'); }
finally { window.close(); }
</script>
Logged in. You can close this tab.
""";
}

// Minimal local user abstraction used above.
// Replace with your own implementation or ASP.NET Identity.
public interface ILocalUserStore
{
    Task<LocalUser> FindOrCreateExternalUserAsync(string provider, string providerKey, string? email, string name);
}

public sealed record LocalUser(Guid Id, string Name, string? Email);
