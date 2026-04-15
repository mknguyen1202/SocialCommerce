using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace UserService.Auth.Jwt;

public static class JwtBearerExtensions
{
    /// <summary>
    /// Adds a dedicated JWT bearer scheme (e.g., for service-to-service) without changing the default cookie scheme.
    /// Use with [Authorize(AuthenticationSchemes = "ApiJwt")].
    /// </summary>
    public static IServiceCollection AddApiJwtBearer(this IServiceCollection services, IConfiguration config, string section = "Authentication:Jwt", string scheme = "ApiJwt")
    {
        TokenOptions opt = config.GetSection(section).Get<TokenOptions>() ?? new TokenOptions();
        services.AddSingleton(opt);

        byte[] keyBytes = Encoding.UTF8.GetBytes(opt.SymmetricKey ?? "");
        if (keyBytes.Length < 32)
            throw new InvalidOperationException("Authentication:Jwt:SymmetricKey must be at least 32 bytes for HS256.");

        SymmetricSecurityKey key = new SymmetricSecurityKey(keyBytes);

        services.AddAuthentication()
            .AddJwtBearer(scheme, o =>
            {
                o.RequireHttpsMetadata = true;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = opt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = opt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(opt.ClockSkewSeconds)
                };
            });

        return services;
    }
}
