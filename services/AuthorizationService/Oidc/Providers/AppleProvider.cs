using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using AuthorizationService.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AuthorizationService.Oidc.Providers;

/// <summary>
/// Sign in with Apple: requires JWT client_secret signed with your .p8 key (ES256).
/// Recommended response_mode=form_post; id_token typically present.
/// </summary>
public sealed class AppleProvider : IProvider
{
    private readonly AppleOptions _opt;
    private readonly TimeProvider _time;

    public AppleProvider(IOptions<AppleOptions> opt, TimeProvider? time = null)
    {
        _opt = opt.Value;
        _time = time ?? TimeProvider.System;
    }

    public string Name => "apple";
    public string ClientId => _opt.ClientId!;
    public string? ClientSecret => null; // generated dynamically
    public string AuthorizeEndpoint => _opt.AuthorizeEndpoint!;
    public string TokenEndpoint => _opt.TokenEndpoint!;
    public string? JwksUri => _opt.JwksUri;
    public string? Authority => _opt.Authority; // https://appleid.apple.com

    public string BuildAuthorizeUrl(AuthorizeRequest req)
    {
        var qs = HttpUtility.ParseQueryString(string.Empty);
        qs["client_id"] = _opt.ClientId!;
        qs["redirect_uri"] = _opt.RedirectUri!;
        qs["response_type"] = "code";
        qs["response_mode"] = _opt.ResponseMode ?? "form_post";
        qs["scope"] = string.Join(' ', _opt.Scopes ?? new[] { "name", "email" });
        qs["state"] = req.State;
        qs["nonce"] = req.Nonce;
        // Apple accepts PKCE in web flow
        qs["code_challenge"] = req.CodeChallenge;
        qs["code_challenge_method"] = req.CodeChallengeMethod;
        return $"{_opt.AuthorizeEndpoint}?{qs}";
    }

    public async Task<Dictionary<string, string>> BuildTokenRequestAsync(ProviderTokenBuildArgs a)
    {
        var clientSecret = await CreateAppleClientSecretAsync();

        var body = new Dictionary<string, string>
        {
            ["client_id"] = _opt.ClientId!,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = _opt.RedirectUri!,
        };

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

        return body;
    }

    private Task<string> CreateAppleClientSecretAsync()
    {
        // Claims per Apple:
        // iss = Team ID, iat = now, exp <= 6 months, aud = https://appleid.apple.com, sub = client_id (Service ID)
        var now = _time.GetUtcNow().UtcDateTime;
        var exp = now.AddMinutes(_opt.ClientSecretLifetimeMinutes > 0 ? _opt.ClientSecretLifetimeMinutes : 15);

        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(_opt.P8PrivateKeyPem!);

        var key = new ECDsaSecurityKey(ecdsa) { KeyId = _opt.KeyId };
        var creds = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256);

        // Build via descriptor (portable across package versions)
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _opt.TeamId,
            Audience = "https://appleid.apple.com",
            NotBefore = now,
            IssuedAt = now,
            Expires = exp,
//# ifdef NETSTANDARD2_0
//            // If your target doesn't have 'Claims' on the descriptor, use Subject = new ClaimsIdentity(...)
//            Subject = new ClaimsIdentity(new[] { new Claim("sub", _opt.ClientId!) }),
//#else
//            Claims = new Dictionary<string, object> { ["sub"] = _opt.ClientId! },
//#endif
            SigningCredentials = creds
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(descriptor);
        return Task.FromResult(handler.WriteToken(token));
    }
}
