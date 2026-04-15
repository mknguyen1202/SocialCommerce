using AuthorizationService.Options;
using AuthorizationService.Sessions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;


namespace AuthorizationService.Oidc;

/// <summary>
/// Best-effort provider sign-out/revocation hook used by LogoutController.
/// This should never block local logout; failures are swallowed.
/// </summary>
public interface IProviderLogoutService
{
    Task TryLogoutAsync(string sessionHandle, CancellationToken ct = default);
}

/// <summary>
/// Default no-op: keeps local logout fast & predictable. Swap to TokenRevocationProviderLogoutService to call providers.
/// </summary>
public sealed class NoopProviderLogoutService : IProviderLogoutService
{
    public Task TryLogoutAsync(string sessionHandle, CancellationToken ct = default) => Task.CompletedTask;
}

/// <summary>
/// Optional “best-effort” token revocation against providers where practical:
/// - Google: POST https://oauth2.googleapis.com/revoke (access/refresh)
/// - Facebook: DELETE https://graph.facebook.com/me/permissions?access_token=...
/// - Apple: POST https://appleid.apple.com/auth/revoke (requires signing client_secret)
/// - Microsoft: (no simple revocation API without Graph perms) – skipped
/// All errors are swallowed; local logout must not depend on these succeeding.
/// </summary>
public sealed class TokenRevocationProviderLogoutService : IProviderLogoutService
{
    private readonly IHttpClientFactory _http;
    private readonly ISessionStore _sessions;
    private readonly IOptions<GoogleOptions> _googleOpt;
    private readonly IOptions<FacebookOptions> _fbOpt;
    private readonly IOptions<AppleOptions> _appleOpt;

    public TokenRevocationProviderLogoutService(
        IHttpClientFactory http,
        ISessionStore sessions,
        IOptions<GoogleOptions> googleOpt,
        IOptions<FacebookOptions> fbOpt,
        IOptions<AppleOptions> appleOpt)
    {
        _http = http;
        _sessions = sessions;
        _googleOpt = googleOpt;
        _fbOpt = fbOpt;
        _appleOpt = appleOpt;
    }

    public async Task TryLogoutAsync(string sessionHandle, CancellationToken ct = default)
    {
        // GOOGLE
        if (await _sessions.GetProviderTokensAsync(sessionHandle, "google", ct) is { } g)
            await SafeCall(() => RevokeGoogleAsync(g, ct));

        // FACEBOOK
        if (await _sessions.GetProviderTokensAsync(sessionHandle, "facebook", ct) is { } f)
            await SafeCall(() => RevokeFacebookAsync(f, ct));

        // APPLE
        if (await _sessions.GetProviderTokensAsync(sessionHandle, "apple", ct) is { } a)
            await SafeCall(() => RevokeAppleAsync(a, ct));

        // MICROSOFT (no simple revocation without Graph perms) – skip
    }

    // ----------------- Provider-specific helpers -----------------

    private async Task RevokeGoogleAsync(ProviderTokenRecord t, CancellationToken ct)
    {
        var token = t.RefreshToken ?? t.AccessToken;
        if (string.IsNullOrEmpty(token)) return;

        var client = _http.CreateClient(nameof(TokenRevocationProviderLogoutService));
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/revoke")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["token"] = token! })
        };
        using var resp = await client.SendAsync(req, ct);
        // 200 expected; ignore failures
    }

    private async Task RevokeFacebookAsync(ProviderTokenRecord t, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(t.AccessToken)) return;

        // DELETE /me/permissions using the user's access_token
        var client = _http.CreateClient(nameof(TokenRevocationProviderLogoutService));
        var url = "https://graph.facebook.com/me/permissions?access_token=" + Uri.EscapeDataString(t.AccessToken!);
        using var req = new HttpRequestMessage(HttpMethod.Delete, url);
        using var resp = await client.SendAsync(req, ct);
        // 200 with { "success": true } typical; ignore failures
    }

    private async Task RevokeAppleAsync(ProviderTokenRecord t, CancellationToken ct)
    {
        var token = t.RefreshToken ?? t.AccessToken;
        if (string.IsNullOrEmpty(token)) return;

        var opts = _appleOpt.Value;
        if (string.IsNullOrWhiteSpace(opts.ClientId) ||
            string.IsNullOrWhiteSpace(opts.TeamId) ||
            string.IsNullOrWhiteSpace(opts.KeyId) ||
            string.IsNullOrWhiteSpace(opts.P8PrivateKeyPem))
            return; // cannot sign client_secret

        var clientSecret = CreateAppleClientSecret(opts);

        var client = _http.CreateClient(nameof(TokenRevocationProviderLogoutService));
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://appleid.apple.com/auth/revoke")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = opts.ClientId!,
                ["client_secret"] = clientSecret,
                ["token"] = token!,
                ["token_type_hint"] = string.IsNullOrEmpty(t.RefreshToken) ? "access_token" : "refresh_token"
            })
        };
        using var resp = await client.SendAsync(req, ct);
        // 200 expected; ignore failures
    }

    // Sign-in with Apple client_secret (ES256) — same shape as used in AppleProvider
    private static string CreateAppleClientSecret(AppleOptions opt)
    {
        var now = DateTime.UtcNow;
        var exp = now.AddMinutes(opt.ClientSecretLifetimeMinutes > 0 ? opt.ClientSecretLifetimeMinutes : 15);

        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(opt.P8PrivateKeyPem!);

        // Set KeyId so 'kid' appears in JWT header automatically
        var key = new ECDsaSecurityKey(ecdsa) { KeyId = opt.KeyId };
        var creds = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256);

        // Build via SecurityTokenDescriptor (portable across package versions)
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = opt.TeamId,
            Audience = "https://appleid.apple.com",
            NotBefore = now,
            IssuedAt = now,
            Expires = exp,
            Subject = new ClaimsIdentity(new[] { new Claim("sub", opt.ClientId!) }),
            SigningCredentials = creds
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }

    private static async Task SafeCall(Func<Task> fn)
    {
        try { await fn(); } catch { /* swallow: best-effort only */ }
    }
}
