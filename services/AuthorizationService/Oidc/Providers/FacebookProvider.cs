using AuthorizationService.Options;
//using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.Extensions.Options;
using System.Web;

namespace AuthorizationService.Oidc.Providers;

/// <remarks>
/// Facebook isn't a strict OIDC provider; typically no id_token. You'll use access_token + Graph API.
/// PKCE is supported for code flow; nonce generally unused.
/// </remarks>
public sealed class FacebookProvider : IProvider
{
    private readonly FacebookOptions _opt;

    public FacebookProvider(IOptions<FacebookOptions> opt)
    {
        _opt = opt.Value;
    }

    public string Name => "facebook";
    public string ClientId => _opt.ClientId!;
    public string? ClientSecret => _opt.ClientSecret;
    public string AuthorizeEndpoint => _opt.AuthorizeEndpoint!;
    public string TokenEndpoint => _opt.TokenEndpoint!;
    public string? JwksUri => null; // no id_token typically
    public string? Authority => null;

    public string BuildAuthorizeUrl(AuthorizeRequest req)
    {
        var qs = HttpUtility.ParseQueryString(string.Empty);
        qs["client_id"] = _opt.ClientId!;
        qs["redirect_uri"] = _opt.RedirectUri!;
        qs["response_type"] = "code";
        if (_opt.Scopes is not null && _opt.Scopes.Length > 0)
            qs["scope"] = string.Join(',', _opt.Scopes); // FB uses comma-separated scopes

        qs["state"] = req.State;

        // PKCE (supported)
        qs["code_challenge"] = req.CodeChallenge;
        qs["code_challenge_method"] = req.CodeChallengeMethod;

        return $"{_opt.AuthorizeEndpoint}?{qs}";
    }

    public Task<Dictionary<string, string>> BuildTokenRequestAsync(ProviderTokenBuildArgs a)
    {
        var body = new Dictionary<string, string>
        {
            ["client_id"] = _opt.ClientId!,
            ["redirect_uri"] = _opt.RedirectUri!,
        };

        // For Facebook, client_secret is required for server-side exchange
        if (!string.IsNullOrWhiteSpace(_opt.ClientSecret))
            body["client_secret"] = _opt.ClientSecret!;

        if (a.GrantType == "authorization_code")
        {
            body["grant_type"] = "authorization_code";
            body["code"] = a.Code!;
            // As of FB docs, code_verifier may be required if PKCE used
            if (!string.IsNullOrEmpty(a.CodeVerifier))
                body["code_verifier"] = a.CodeVerifier!;
        }
        else
        {
            body["grant_type"] = "fb_exchange_token"; // Long-lived token exchange pattern
            body["fb_exchange_token"] = a.RefreshToken!; // Not standard OAuth 'refresh_token'
        }

        return Task.FromResult(body);
    }
}
