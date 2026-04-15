using System.Web;
using Microsoft.Extensions.Options;
using AuthorizationService.Options;

namespace AuthorizationService.Oidc.Providers;

public sealed class MicrosoftProvider : IProvider
{
    private readonly MicrosoftOptions _opt;

    public MicrosoftProvider(IOptions<MicrosoftOptions> opt)
    {
        _opt = opt.Value;
    }

    public string Name => "microsoft";
    public string ClientId => _opt.ClientId!;
    public string? ClientSecret => _opt.ClientSecret;
    public string AuthorizeEndpoint => _opt.AuthorizeEndpoint!;
    public string TokenEndpoint => _opt.TokenEndpoint!;
    public string? JwksUri => _opt.JwksUri;
    public string? Authority => _opt.Authority; // https://login.microsoftonline.com/{tenant}/v2.0

    public string BuildAuthorizeUrl(AuthorizeRequest req)
    {
        var qs = HttpUtility.ParseQueryString(string.Empty);
        qs["client_id"] = _opt.ClientId!;
        qs["redirect_uri"] = _opt.RedirectUri!;
        qs["response_type"] = "code";
        qs["scope"] = string.Join(' ', _opt.Scopes ?? new[] { "openid", "email", "profile" });
        qs["response_mode"] = _opt.ResponseMode ?? "query";
        qs["state"] = req.State;
        qs["nonce"] = req.Nonce;
        qs["code_challenge"] = req.CodeChallenge;
        qs["code_challenge_method"] = req.CodeChallengeMethod;
        if (!string.IsNullOrWhiteSpace(_opt.Prompt)) qs["prompt"] = _opt.Prompt;

        return $"{_opt.AuthorizeEndpoint}?{qs}";
    }

    public Task<Dictionary<string, string>> BuildTokenRequestAsync(ProviderTokenBuildArgs a)
    {
        var body = new Dictionary<string, string>
        {
            ["client_id"] = _opt.ClientId!,
            ["redirect_uri"] = _opt.RedirectUri!,
        };

        if (!string.IsNullOrEmpty(_opt.ClientSecret))
            body["client_secret"] = _opt.ClientSecret!;

        if (a.GrantType == "authorization_code")
        {
            body["grant_type"] = "authorization_code";
            body["code"] = a.Code!;
            body["code_verifier"] = a.CodeVerifier!;
        }
        else
        {
            body["grant_type"] = "refresh_token";
            body["refresh_token"] = a.RefreshToken!;
        }

        return Task.FromResult(body);
    }
}
