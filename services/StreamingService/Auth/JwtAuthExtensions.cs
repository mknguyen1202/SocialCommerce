using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace StreamingService.Auth;

public static class JwtAuthExtensions
{
    public static IServiceCollection AddServiceJwtAuth(this IServiceCollection services, IConfiguration config)
    {
        string key = config["Authentication:Jwt:SymmetricKey"]
            ?? throw new InvalidOperationException("Authentication:Jwt:SymmetricKey is not configured.");
        string issuer = config["Authentication:Jwt:Issuer"] ?? "SocialCommerce";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opts =>
            {
                opts.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        return services;
    }
}
