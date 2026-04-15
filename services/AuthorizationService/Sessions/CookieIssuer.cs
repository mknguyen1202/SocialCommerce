using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AuthorizationService.Sessions;

public interface ICookieIssuer
{
    void Issue(HttpContext context, string sessionHandle);
    void Delete(HttpContext context);
    string? TryGetHandle(HttpContext context);
}

public sealed class CookieIssuer : ICookieIssuer
{
    private readonly SessionCookieOptions _opt;

    public CookieIssuer(IOptions<SessionCookieOptions> opt)
    {
        _opt = opt.Value;
    }

    public void Issue(HttpContext context, string sessionHandle)
    {
        var cookieName = GetCookieName();
        var cookieOptions = BuildCookieOptions();

        // MaxAge/Expires only if persistent cookie enabled
        if (_opt.PersistentCookie && _opt.IdleTimeoutMinutes > 0)
        {
            cookieOptions.MaxAge = TimeSpan.FromMinutes(_opt.IdleTimeoutMinutes);
            cookieOptions.Expires = DateTimeOffset.UtcNow.AddMinutes(_opt.IdleTimeoutMinutes);
        }

        context.Response.Cookies.Append(cookieName, sessionHandle, cookieOptions);
    }

    public void Delete(HttpContext context)
    {
        var cookieName = GetCookieName();
        var options = BuildCookieOptions();
        // Overwrite with expired; browsers need same attributes when deleting
        options.Expires = DateTimeOffset.UnixEpoch;
        context.Response.Cookies.Append(cookieName, "", options);
    }

    public string? TryGetHandle(HttpContext context)
    {
        var cookieName = GetCookieName();
        if (context.Request.Cookies.TryGetValue(cookieName, out var v))
            return string.IsNullOrWhiteSpace(v) ? null : v;
        return null;
    }

    private string GetCookieName()
    {
        if (_opt.UseHostPrefix && _opt.SecurePolicy == CookieSecurePolicy.Always && _opt.Path == "/" && _opt.Domain is null)
            return $"__Host-{_opt.Name}";
        return _opt.Name;
    }

    private CookieOptions BuildCookieOptions() => new CookieOptions
    {
        HttpOnly = _opt.HttpOnly,
        Secure = _opt.SecurePolicy != CookieSecurePolicy.None,
        SameSite = _opt.SameSite,
        Path = _opt.Path,
        Domain = _opt.Domain,
        IsEssential = true // in case of consent features
    };
}
