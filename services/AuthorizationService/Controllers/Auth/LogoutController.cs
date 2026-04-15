using AuthorizationService.Security;
using AuthorizationService.Sessions;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using AuthorizationService.Oidc;


namespace AuthorizationService.Controllers.Auth;

[ApiController]
[Route("auth/logout")]
public class LogoutController : ControllerBase
{
    private readonly ISessionStore _sessionStore;
    private readonly ICsrfService _csrf;
    private readonly ICookieIssuer _cookieIssuer;
    private readonly IProviderLogoutService _providerLogout; // optional per-provider front/back-channel

    public LogoutController(
        ISessionStore sessionStore,
        ICsrfService csrf,
        ICookieIssuer cookieIssuer,
        IProviderLogoutService providerLogout
        )
    {
        _sessionStore = sessionStore;
        _csrf = csrf;
        _cookieIssuer = cookieIssuer;
        _providerLogout = providerLogout;
    }

    // CSRF-protected state-changing request
    [HttpPost]
    public async Task<IActionResult> Post([FromHeader(Name = "X-CSRF-Token")] string? csrfHeader = null)
    {
        var handle = _cookieIssuer.TryGetHandle(HttpContext);
        if (handle is null) return NoContent(); // already logged out

        // Double-submit validation: header must match cookie value bound to session
        if (!_csrf.Validate(HttpContext, handle, csrfHeader))
            return Forbid(); // CSRF failed

        // Optional: attempt provider logout (best-effort, varies per provider)
        await _providerLogout.TryLogoutAsync(handle);

        await _sessionStore.DeleteAsync(handle);
        _cookieIssuer.Delete(HttpContext);

        return NoContent();
    }
}
