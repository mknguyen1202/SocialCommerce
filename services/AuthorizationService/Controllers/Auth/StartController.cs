using AuthorizationService.Oidc;
using AuthorizationService.Options;
using AuthorizationService.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Web;

namespace AuthorizationService.Controllers.Auth;

[ApiController]
[Route("auth/{provider}/start")]
public class StartController : ControllerBase
{
    private readonly IStateStore _stateStore;
    private readonly INonceStore _nonceStore;
    private readonly IPkceService _pkce;
    private readonly IProviderRegistry _providers; // resolves IProvider by name
    private readonly IUrlEncoder _urlEncoder;      // thin wrapper over WebUtility/Uri for consistency
    private readonly IReturnUrlValidator _returnUrlValidator;

    public StartController(
        IStateStore stateStore,
        INonceStore nonceStore,
        IPkceService pkce,
        IProviderRegistry providers,
        IUrlEncoder urlEncoder,
        IReturnUrlValidator returnUrlValidator)
    {
        _stateStore = stateStore;
        _nonceStore = nonceStore;
        _pkce = pkce;
        _providers = providers;
        _urlEncoder = urlEncoder;
        _returnUrlValidator = returnUrlValidator;
    }

    [HttpGet]
    public async Task<IActionResult> Start([FromRoute] string provider, [FromQuery] string? returnUrl = null)
    {
        var prov = _providers.Get(provider);
        if (prov is null) return NotFound($"Unknown provider '{provider}'.");

        // Generate PKCE + OIDC params
        var codeVerifier = _pkce.GenerateCodeVerifier();
        var codeChallenge = _pkce.CreateCodeChallenge(codeVerifier);
        var state = CryptoRandom.CreateBase64Url(32);
        var nonce = CryptoRandom.CreateBase64Url(32);

        // Validate and normalize returnUrl (avoid open redirect)
        var normalizedReturnUrl = _returnUrlValidator.Normalize(returnUrl) ?? "/";

        // Persist short-lived artifacts, tied to state
        await _stateStore.SaveAsync(state, new AuthStateRecord
        {
            Provider = provider,
            CodeVerifier = codeVerifier,
            Nonce = nonce,
            ReturnUrl = normalizedReturnUrl,
            CreatedUtc = DateTimeOffset.UtcNow
        });

        await _nonceStore.SaveAsync(nonce, TimeSpan.FromMinutes(10));

        // Build provider authorize URL
        var authorizeUrl = prov.BuildAuthorizeUrl(new AuthorizeRequest
        {
            CodeChallenge = codeChallenge,
            CodeChallengeMethod = "S256",
            State = state,
            Nonce = nonce
        });

        return Redirect(authorizeUrl);
    }
}
