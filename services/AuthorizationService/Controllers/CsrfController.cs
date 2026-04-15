using AuthorizationService.Security;
using AuthorizationService.Sessions;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AuthorizationService.Controllers;

[ApiController]
[Route("auth/csrf")]
public class CsrfController : ControllerBase
{
    private readonly ICsrfService _csrf;
    private readonly ICookieIssuer _cookieIssuer;

    public CsrfController(ICsrfService csrf, ICookieIssuer cookieIssuer)
    {
        _csrf = csrf;
        _cookieIssuer = cookieIssuer;
    }

    // Returns a token and sets an XSRF cookie for double-submit (readable by JS)
    [HttpGet]
    public IActionResult Get()
    {
        var sessionId = _cookieIssuer.TryGetHandle(HttpContext);
        if (sessionId is null) return Unauthorized();

        var token = _csrf.IssueToken(sessionId);
        _csrf.SetDoubleSubmitCookie(HttpContext, token); // non-HttpOnly cookie e.g. "XSRF-TOKEN"
        return Ok(new { token });
    }
}
