using AuthorizationService.Bff;
using AuthorizationService.Oidc;
using AuthorizationService.Security;
using AuthorizationService.Sessions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;

using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace AuthorizationService.Controllers.Auth;

[ApiController]
[Route("auth/{provider}/callback")]
public class CallbackController : ControllerBase
{
    private readonly IStateStore _stateStore;
    private readonly IProviderRegistry _providers;
    private readonly ITokenExchangeService _tokenEx;
    private readonly IIdTokenValidator _idTokenValidator;
    private readonly IClaimsEnricher _claimsEnricher;
    private readonly ISessionStore _sessionStore;
    private readonly TimeProvider _time;
    private readonly ICookieIssuer _cookieIssuer; // abstracts app cookie name & options

    public CallbackController(
        IStateStore stateStore,
        IProviderRegistry providers,
        ITokenExchangeService tokenEx,
        IIdTokenValidator idTokenValidator,
        IClaimsEnricher claimsEnricher,
        ISessionStore sessionStore,
        TimeProvider time,
        ICookieIssuer cookieIssuer)
    {
        _stateStore = stateStore;
        _providers = providers;
        _tokenEx = tokenEx;
        _idTokenValidator = idTokenValidator;
        _claimsEnricher = claimsEnricher;
        _sessionStore = sessionStore;
        _time = time;
        _cookieIssuer = cookieIssuer;
    }

    [HttpGet]
    public async Task<IActionResult> Callback(
        [FromRoute] string provider,
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery(Name = "error")] string? errorCode = null,
        [FromQuery(Name = "error_description")] string? errorDesc = null)
    {
        if (!string.IsNullOrEmpty(errorCode))
            return BadRequest(new { error = errorCode, error_description = errorDesc });

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            return BadRequest(new { error = "invalid_request" });

        var prov = _providers.Get(provider);
        if (prov is null) return NotFound($"Unknown provider '{provider}'.");

        var saved = await _stateStore.TakeAsync(state); // one-time read, then delete
        if (saved is null || !string.Equals(saved.Provider, provider, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "invalid_state" });

        // Redeem the authorization code using saved.code_verifier
        var tokenResult = await _tokenEx.RedeemCodeAsync(prov, new TokenExchangeRequest
        {
            Code = code,
            CodeVerifier = saved.CodeVerifier
        });

        if (!tokenResult.Success)
            return StatusCode(502, new { error = "token_exchange_failed", detail = tokenResult.Error });

        // Validate id_token if present (OIDC providers)
        OidcIdTokenPayload? idPayload = null;
        if (!string.IsNullOrEmpty(tokenResult.IdToken))
        {
            var validation = await _idTokenValidator.ValidateAsync(prov, tokenResult.IdToken!, expectedNonce: saved.Nonce);
            if (!validation.Success)
                return Unauthorized(new { error = "invalid_id_token", detail = validation.Error });
            idPayload = validation.Payload;
        }

        var expiresAt = _time.GetUtcNow() + TimeSpan.FromSeconds(tokenResult.ExpiresInSeconds ?? 3600);

        // Build our app identity/claims from provider tokens + id claims
        var enriched = await _claimsEnricher.EnrichAsync(new ClaimsEnricherInput
        {
            Provider = provider,
            AccessToken = tokenResult.AccessToken,
            RefreshToken = tokenResult.RefreshToken,
            IdToken = tokenResult.IdToken,
            ExpiresAtUtc = expiresAt,
            IdPayload = idPayload
        });

        // Create server session and store provider tokens server-side (encrypted at rest)
        var sessionHandle = await _sessionStore.CreateAsync(new SessionCreateRequest
        {
            User = enriched.User,
            Claims = enriched.Claims,
            ProviderTokens = new ProviderTokenRecord
            {
                Provider = provider,
                AccessToken = tokenResult.AccessToken,
                RefreshToken = tokenResult.RefreshToken,
                IdToken = tokenResult.IdToken,
                ExpiresAtUtc = expiresAt,
                Scopes = tokenResult.Scope ?? string.Empty
            }
        });

        // Issue BFF session cookie (HttpOnly; no tokens to browser)
        _cookieIssuer.Issue(HttpContext, sessionHandle);

        // Redirect to original returnUrl (default “/” already normalized at /start)
        return Redirect(saved.ReturnUrl);
    }
}
