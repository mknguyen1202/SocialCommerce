using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;

namespace UserService.Auth.Bff;

public static class CookieSchemes
{
    // Scheme names
    public const string App = "App";                  // primary sign-in cookie (your app session)
    public const string External = "App.External";    // short-lived temp cookie during external flow

    // Cookie names
    public const string AuthCookieName = "App.Auth";
    public const string ExternalCookieName = "App.External";
    public const string CsrfCookieName = "App.CSRF";
}

/// <summary>
/// Options for cookie behavior. Set CrossSite=true if SPA is on a different origin
/// (this will set SameSite=None for cookies).
/// </summary>
public sealed class BffCookieOptions
{
    public bool CrossSite { get; set; } = false;
    public string? Domain { get; set; } = null;                 // e.g. ".example.com" if you need it
    public TimeSpan AppCookieLifetime { get; set; } = TimeSpan.FromHours(8);
    public TimeSpan ExternalCookieLifetime { get; set; } = TimeSpan.FromMinutes(5);
}

public static class CookieAuthExtensions
{
    /// <summary>
    /// Registers the App + External cookie schemes with sensible defaults for BFF.
    /// Call this once during startup (before mapping endpoints).
    /// </summary>
    public static AuthenticationBuilder AddAppCookieAuthentication(
        this IServiceCollection services,
        Action<BffCookieOptions>? configure = null)
    {
        BffCookieOptions opts = new BffCookieOptions();
        configure?.Invoke(opts);

        SameSiteMode sameSite = opts.CrossSite ? SameSiteMode.None : SameSiteMode.Lax;

        AuthenticationBuilder builder = services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieSchemes.App;
        })
        .AddCookie(CookieSchemes.App, o =>
        {
            o.Cookie.Name = CookieSchemes.AuthCookieName;
            o.Cookie.HttpOnly = true;
            o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            o.Cookie.SameSite = sameSite;
            if (!string.IsNullOrWhiteSpace(opts.Domain)) o.Cookie.Domain = opts.Domain;
            o.SlidingExpiration = true;
            o.ExpireTimeSpan = opts.AppCookieLifetime;
        })
        .AddCookie(CookieSchemes.External, o =>
        {
            o.Cookie.Name = CookieSchemes.ExternalCookieName;
            o.Cookie.HttpOnly = true;
            o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            o.Cookie.SameSite = sameSite;
            if (!string.IsNullOrWhiteSpace(opts.Domain)) o.Cookie.Domain = opts.Domain;
            o.SlidingExpiration = false;
            o.ExpireTimeSpan = opts.ExternalCookieLifetime;
        });

        // Make BffCookieOptions available for CSRF writer, etc.
        services.AddSingleton(opts);

        return builder;
    }
}
