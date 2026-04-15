using AuthorizationService.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthorizationService.Controllers;

[ApiController]
[Route("me")]
public class MeController : ControllerBase
{
    private readonly ISessionStore _sessionStore;
    private readonly ICookieIssuer _cookieIssuer;

    public MeController(ISessionStore sessionStore, ICookieIssuer cookieIssuer)
    {
        _sessionStore = sessionStore;
        _cookieIssuer = cookieIssuer;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var handle = _cookieIssuer.TryGetHandle(HttpContext);
        if (handle is null) return Unauthorized();

        var session = await _sessionStore.GetAsync(handle);
        if (session is null) return Unauthorized();

        // Shape the response as you like
        return Ok(new
        {
            id = session.User.Id,
            email = session.User.Email,
            name = session.User.Name,
            picture = session.User.Picture,
            roles = session.Claims.Where(c => c.Type == "role").Select(c => c.Value).ToArray(),
            permissions = session.Claims.Where(c => c.Type == "perm").Select(c => c.Value).ToArray()
        });
    }
}
