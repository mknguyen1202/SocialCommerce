using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using UserService.Auth.Abstractions;

namespace UserService.Auth.External.Core;

public interface IExternalAuthRegistry
{
    IExternalAuthProvider? Find(string name);
    IReadOnlyList<string> Names { get; }
}

internal sealed class ExternalAuthRegistry : IExternalAuthRegistry
{
    private readonly Dictionary<string, IExternalAuthProvider> _byName;
    public ExternalAuthRegistry(IEnumerable<IExternalAuthProvider> providers)
    {
        _byName = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
    }
    public IExternalAuthProvider? Find(string name) =>
        _byName.TryGetValue(name, out IExternalAuthProvider? p) ? p : null;

    public IReadOnlyList<string> Names => _byName.Keys.OrderBy(n => n).ToArray();
}

public static class ExternalAuthRegistrar
{
    /// <summary>
    /// Registers provider adapters (Google/Facebook/Apple) conditionally from config
    /// and exposes a registry for resolving by name at runtime.
    /// </summary>
    public static IServiceCollection AddExternalAuthProviders(this IServiceCollection services, IConfiguration config)
    {
        // Google
        Google.GoogleOptions? g = config.GetSection("Authentication:Google").Get<Google.GoogleOptions>();
        if (!string.IsNullOrWhiteSpace(g?.ClientId) && !string.IsNullOrWhiteSpace(g?.ClientSecret))
        {
            services.AddSingleton(g);
            services.AddSingleton<IExternalAuthProvider, Google.GoogleAuthProvider>();
        }

        // Facebook
        string? fbAppId = config["Authentication:Facebook:AppId"];
        string? fbSecret = config["Authentication:Facebook:AppSecret"];
        if (!string.IsNullOrWhiteSpace(fbAppId) && !string.IsNullOrWhiteSpace(fbSecret))
        {
            services.AddHttpClient("facebook"); // used to fill email if missing
            services.AddSingleton<IExternalAuthProvider, Facebook.FacebookAuthProvider>();
        }

        // Apple
        Apple.AppleOptions? apple = config.GetSection("Authentication:Apple").Get<Apple.AppleOptions>();
        if (!string.IsNullOrWhiteSpace(apple?.ClientId) &&
            !string.IsNullOrWhiteSpace(apple?.TeamId) &&
            !string.IsNullOrWhiteSpace(apple?.KeyId) &&
            !string.IsNullOrWhiteSpace(apple?.PrivateKeyPath))
        {
            services.AddSingleton(apple);
            services.AddSingleton<IAppleClientSecretSigner, Apple.AppleClientSecretSigner>();
            services.AddSingleton<IExternalAuthProvider, Apple.AppleAuthProvider>();
        }

        services.AddSingleton<IExternalAuthRegistry, ExternalAuthRegistry>();
        return services;
    }
}
