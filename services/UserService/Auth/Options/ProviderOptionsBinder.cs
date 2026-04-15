using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using UserService.Auth.Bff;
using UserService.Auth.External.Apple;
using UserService.Auth.External.Google;
using UserService.Auth.Jwt;

namespace UserService.Auth.Options;

public static class ProviderOptionsBinder
{
    /// <summary>
    /// Binds common auth-related options from configuration and registers them for DI.
    /// Sections expected:
    ///   Auth: { CrossSite, CookieDomain, AppCookieHours, ExternalCookieMinutes, ... }
    ///   Authentication:Google: { ClientId, ClientSecret, ExtraScopes[] }
    ///   Authentication:Apple:  { ClientId, TeamId, KeyId, PrivateKeyPath, ClientSecretDays }
    ///   Authentication:Jwt:    { Issuer, Audience, SymmetricKey, AccessTokenMinutes, ClockSkewSeconds }
    /// </summary>
    public static IServiceCollection AddAuthOptionsFromConfig(this IServiceCollection services, IConfiguration config)
    {
        // Top-level Auth options (BFF cookie knobs)
        AuthOptions auth = config.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
        services.AddSingleton(auth);

        // Map to BFF cookie options (used by CookieSchemes extension)
        services.AddSingleton(new BffCookieOptions
        {
            CrossSite = auth.CrossSite,
            Domain = auth.CookieDomain,
            AppCookieLifetime = TimeSpan.FromHours(auth.AppCookieHours),
            ExternalCookieLifetime = TimeSpan.FromMinutes(auth.ExternalCookieMinutes)
        });

        // Google
        GoogleOptions? google = config.GetSection("Authentication:Google").Get<GoogleOptions>();
        if (google is not null) services.AddSingleton(google);

        // Apple
        AppleOptions? apple = config.GetSection("Authentication:Apple").Get<AppleOptions>();
        if (apple is not null) services.AddSingleton(apple);

        // JWT (optional)
        TokenOptions? jwt = config.GetSection("Authentication:Jwt").Get<TokenOptions>();
        if (jwt is not null) services.AddSingleton(jwt);

        // NOTE: Facebook typically doesn't need a typed options class here;
        // you configure the handler directly with AppId/AppSecret in Program.cs.

        return services;
    }
}
