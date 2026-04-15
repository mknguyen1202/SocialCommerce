using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AuthorizationService.Security;

public interface ICsrfService
{
    /// <summary>Creates a CSRF token bound to the given session handle.</summary>
    string IssueToken(string sessionHandle);

    /// <summary>Sets the double-submit cookie (readable by JS) with the given token.</summary>
    void SetDoubleSubmitCookie(HttpContext ctx, string token);

    /// <summary>
    /// Validates the incoming request for CSRF:
    /// - DoubleSubmit mode: header must equal cookie, token must be valid and bound to session.
    /// - HeaderOnly mode: header must contain a valid token bound to session.
    /// </summary>
    bool Validate(HttpContext ctx, string sessionHandle, string? headerToken);
}

public sealed class CsrfService : ICsrfService
{
    private readonly IDataProtector _protector;
    private readonly SecurityOptions _opt;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public CsrfService(IDataProtectionProvider dp, IOptions<SecurityOptions> opt)
    {
        _protector = dp.CreateProtector("AuthorizationService.CSRF.v1");
        _opt = opt.Value;
    }

    public string IssueToken(string sessionHandle)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        CsrfPayload payload = new CsrfPayload
        {
            Sid = sessionHandle,
            Iat = now,
            Exp = now.AddMinutes(Math.Max(1, _opt.Csrf.TokenTtlMinutes)),
            Nonce = CryptoRandom.CreateBase64Url(16)
        };
        string json = JsonSerializer.Serialize(payload, _json);
        return _protector.Protect(json);
    }

    public void SetDoubleSubmitCookie(HttpContext ctx, string token)
    {
        string cookieName = _opt.Csrf.CookieName;
        CookieOptions cookie = new CookieOptions
        {
            HttpOnly = false, // readable by JS for double-submit
            Secure = _opt.Csrf.Secure,
            Path = _opt.Csrf.Path,
            SameSite = ParseSameSite(_opt.Csrf.SameSite),
            IsEssential = true,
            MaxAge = TimeSpan.FromMinutes(Math.Max(1, _opt.Csrf.TokenTtlMinutes))
        };
        ctx.Response.Cookies.Append(cookieName, token, cookie);
    }

    public bool Validate(HttpContext ctx, string sessionHandle, string? headerToken)
    {
        if (string.IsNullOrWhiteSpace(headerToken))
            return false;

        string? cookieToken = null;
        if (_opt.Csrf.Mode == CsrfMode.DoubleSubmit)
        {
            ctx.Request.Cookies.TryGetValue(_opt.Csrf.CookieName, out cookieToken);
            if (string.IsNullOrWhiteSpace(cookieToken) || !CryptographicEquals(headerToken, cookieToken))
                return false;
        }

        // Unprotect and verify payload (binds token to session and expiry)
        CsrfPayload? payload = Unprotect(headerToken);
        if (payload is null) return false;
        if (!string.Equals(payload.Sid, sessionHandle, StringComparison.Ordinal))
            return false;
        if (DateTimeOffset.UtcNow > payload.Exp)
            return false;

        return true;
    }

    private CsrfPayload? Unprotect(string token)
    {
        try
        {
            string json = _protector.Unprotect(token);
            return JsonSerializer.Deserialize<CsrfPayload>(json, _json);
        }
        catch
        {
            return null;
        }
    }

    private static SameSiteMode ParseSameSite(string v) => v?.ToLowerInvariant() switch
    {
        "none" => SameSiteMode.None,
        "strict" => SameSiteMode.Strict,
        _ => SameSiteMode.Lax
    };

    private static bool CryptographicEquals(string a, string b)
    {
        // constant-time comparison
        var ba = System.Text.Encoding.UTF8.GetBytes(a);
        var bb = System.Text.Encoding.UTF8.GetBytes(b);
        var diff = (uint)ba.Length ^ (uint)bb.Length;
        var len = Math.Min(ba.Length, bb.Length);
        for (int i = 0; i < len; i++)
            diff |= (uint)(ba[i] ^ bb[i]);
        return diff == 0;
    }

    private sealed class CsrfPayload
    {
        public string Sid { get; set; } = default!;               // session handle
        public DateTimeOffset Iat { get; set; }                   // issued at
        public DateTimeOffset Exp { get; set; }                   // expiry
        public string Nonce { get; set; } = default!;             // optional entropy
    }
}
