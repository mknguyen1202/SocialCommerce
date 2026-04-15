using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace RealTimeHub.Auth;

public static class JwtAuthExtensions
{
    public static IServiceCollection AddHubJwtAuth(this IServiceCollection services, IConfiguration config)
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
                // SignalR passes the token via ?access_token= query string
                opts.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        string token = ctx.Request.Query["access_token"];
                        PathString path = ctx.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                            ctx.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }
}
