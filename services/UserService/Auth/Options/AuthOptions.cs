namespace UserService.Auth.Options;

/// <summary>
/// Top-level auth settings you can bind from configuration.
/// These complement the more specific BFF cookie + JWT options.
/// </summary>
public sealed class AuthOptions
{
    // BFF cookie/session knobs
    public bool CrossSite { get; init; } = false;      // If SPA is on a different origin
    public string? CookieDomain { get; init; } = null; // e.g. ".example.com"
    public int AppCookieHours { get; init; } = 8;
    public int ExternalCookieMinutes { get; init; } = 5;

    // Names (override if you need to integrate with an existing system)
    public string AuthCookieName { get; init; } = "App.Auth";
    public string ExternalCookieName { get; init; } = "App.External";
    public string CsrfCookieName { get; init; } = "App.CSRF";
}
