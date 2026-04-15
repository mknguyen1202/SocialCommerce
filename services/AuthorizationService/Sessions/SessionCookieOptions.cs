using Microsoft.AspNetCore.Http;

namespace AuthorizationService.Sessions;

public sealed class SessionCookieOptions
{
    /// <summary>Cookie name. If UseHostPrefix=true and conditions met, it will be emitted as "__Host-{Name}".</summary>
    public string Name { get; set; } = "bff.session";

    /// <summary>If true, cookie is issued with "__Host-" prefix (requires Secure, Path="/", and no Domain).</summary>
    public bool UseHostPrefix { get; set; } = true;

    public bool HttpOnly { get; set; } = true;
    public CookieSecurePolicy SecurePolicy { get; set; } = CookieSecurePolicy.Always;
    public SameSiteMode SameSite { get; set; } = SameSiteMode.Lax;
    public string Path { get; set; } = "/";
    public string? Domain { get; set; } = null;

    /// <summary>Rolling idle timeout for server-side session persistence.</summary>
    public int IdleTimeoutMinutes { get; set; } = 45;

    /// <summary>Absolute cap on session life (0 = disabled).</summary>
    public int AbsoluteLifetimeDays { get; set; } = 14;

    /// <summary>Issue a persistent cookie with Max-Age ~= IdleTimeout. If false, session cookie (browser lifetime).</summary>
    public bool PersistentCookie { get; set; } = false;
}
