using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;

namespace UserService.Auth.Bff.Csrf;

public interface ICsrfCookieWriter
{
    string CookieName { get; }
    /// <summary>Writes a new CSRF token cookie (readable by JS) if missing, or refreshes it after login.</summary>
    void Write(HttpContext ctx);
    /// <summary>Deletes the CSRF cookie (e.g., on logout).</summary>
    void Delete(HttpContext ctx);
}

public sealed class CsrfCookieWriter : ICsrfCookieWriter
{
    private readonly BffCookieOptions _cookieOpts;

    public CsrfCookieWriter(BffCookieOptions cookieOpts) => _cookieOpts = cookieOpts;

    public string CookieName => CookieSchemes.CsrfCookieName;

    public void Write(HttpContext ctx)
    {
        string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        SameSiteMode sameSite = _cookieOpts.CrossSite ? SameSiteMode.None : SameSiteMode.Lax;

        CookieOptions opts = new CookieOptions
        {
            HttpOnly = false,                         // must be readable by JS to echo in X-CSRF
            Secure = true,
            SameSite = sameSite,
            IsEssential = true
        };
        if (!string.IsNullOrWhiteSpace(_cookieOpts.Domain))
            opts.Domain = _cookieOpts.Domain;

        ctx.Response.Cookies.Append(CookieSchemes.CsrfCookieName, token, opts);
    }

    public void Delete(HttpContext ctx)
    {
        SameSiteMode sameSite = _cookieOpts.CrossSite ? SameSiteMode.None : SameSiteMode.Lax;
        CookieOptions opts = new CookieOptions
        {
            Secure = true,
            SameSite = sameSite
        };
        if (!string.IsNullOrWhiteSpace(_cookieOpts.Domain))
            opts.Domain = _cookieOpts.Domain;

        ctx.Response.Cookies.Delete(CookieSchemes.CsrfCookieName, opts);
    }
}
