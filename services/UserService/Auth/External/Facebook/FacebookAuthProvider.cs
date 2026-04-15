using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;
using UserService.Auth.Abstractions;
using UserService.Auth.Bff;                 // CookieSchemes
using UserService.Auth.External.Core;

namespace UserService.Auth.External.Facebook;

public sealed class FacebookAuthProvider : IExternalAuthProvider
{
    private readonly IHttpClientFactory _http;

    public FacebookAuthProvider(IHttpClientFactory http) => _http = http;

    public string Name => "Facebook";

    public AuthenticationProperties BuildChallengeProperties(HttpContext ctx, string callbackPath)
        => new AuthenticationProperties { RedirectUri = callbackPath };

    public async Task<ExternalUserInfo?> HandleCallbackAsync(HttpContext ctx)
    {
        AuthenticateResult result = await ctx.AuthenticateAsync(CookieSchemes.External);
        if (!result.Succeeded || result.Principal is null) return null;

        ClaimsPrincipal p = result.Principal;

        // Facebook handler usually gives NameIdentifier == fb id
        string? id = p.FindFirst(ClaimTypes.NameIdentifier)?.Value
              ?? p.FindFirst("id")?.Value
              ?? p.FindFirst("urn:facebook:id")?.Value;
        if (string.IsNullOrEmpty(id)) return null;

        string? email = p.FindFirst(ClaimTypes.Email)?.Value;          // may be absent
        string? name = p.FindFirst(ClaimTypes.Name)?.Value;

        // Try fill email via Graph if missing and access token exists
        if (string.IsNullOrEmpty(email))
        {
            string? accessToken = result.Properties?.GetTokens()?.FirstOrDefault(t => t.Name == "access_token")?.Value;
            if (!string.IsNullOrEmpty(accessToken))
            {
                try
                {
                    HttpClient client = _http.CreateClient("facebook");
                    GraphMe? resp = await client.GetFromJsonAsync<GraphMe>(
                        $"https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token={accessToken}");
                    if (resp is not null && string.Equals(resp.id, id, StringComparison.Ordinal))
                    {
                        email ??= resp.email;
                        name ??= resp.name;
                    }
                }
                catch { /* best-effort only */ }
            }
        }

        Dictionary<string, string> raw = p.Claims.GroupBy(c => c.Type).ToDictionary(g => g.Key, g => g.First().Value);
        return new ExternalUserInfo("Facebook", id, email, name, null, raw);
    }

    private sealed class GraphMe
    {
        public string id { get; set; } = "";
        public string? email { get; set; }
        public string? name { get; set; }
    }
}
