using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace UserService.Auth
{
    public static class JwtAuthExtensions
    {
        public static IServiceCollection AddJwtAuth(this IServiceCollection services, IConfiguration config)
        {
            // --------------- REAL CODE
    //        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    //.AddJwtBearer(o =>
    //{
    //    o.MapInboundClaims = false; // <-- important to keep "scp" as "scp"
    //    o.TokenValidationParameters = new TokenValidationParameters
    //    {
    //        ValidateIssuer = true,
    //        ValidIssuer = builder.Configuration["Jwt:Issuer"],
    //        ValidateAudience = true,
    //        ValidAudience = builder.Configuration["Jwt:Audience"],
    //        ValidateLifetime = true,
    //        ValidateIssuerSigningKey = true,
    //        IssuerSigningKey = new SymmetricSecurityKey(
    //            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
    //        ClockSkew = TimeSpan.Zero
    //    };
    //});
    //        .AddJwtBearer(options =>
    //        {
    //            options.Authority = config["Jwt:Authority"];
    //            options.Audience = config["Jwt:Audience"]; // aka Client ID / API Application ID
    //            options.TokenValidationParameters = new()
    //            {
    //                ValidateIssuer = bool.TryParse(config["Jwt:ValidateIssuer"], out var v) ? v : true,
    //                ValidateAudience = true,
    //                ValidateLifetime = true,
    //                ValidateIssuerSigningKey = true
    //            };


    //            // For SignalR/WebSockets or BFF scenarios, accept access token in query when needed
    //            options.Events = new JwtBearerEvents
    //            {
    //                OnMessageReceived = context =>
    //                {
    //                    var accessToken = context.Request.Query["access_token"].ToString();
    //                    var path = context.HttpContext.Request.Path;
    //                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
    //                        context.Token = accessToken;
    //                    return Task.CompletedTask;
    //                }
    //            };
    //        });


    //        services.AddAuthorization(options =>
    //        {
    //            options.AddPolicy("user.read", p => p.RequireClaim("scp", "user.read").RequireAuthenticatedUser());
    //            options.AddPolicy("user.write", p => p.RequireClaim("scp", "user.write").RequireAuthenticatedUser());
    //        });


            //--------------- TESTING / DEMO CODE (allows anonymous requests)
    //        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    //.AddJwtBearer(o =>
    //{
    //    o.TokenValidationParameters = new()
    //    {
    //        ValidateIssuer = true,
    //        ValidateAudience = true,
    //        ValidateIssuerSigningKey = true,
    //        ValidateLifetime = true,
    //        ValidIssuer = config["Jwt:Issuer"],
    //        ValidAudience = config["Jwt:Audience"],
    //        IssuerSigningKey = new SymmetricSecurityKey(
    //            Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
    //        ClockSkew = TimeSpan.FromMinutes(2)
    //    };
    //    // o.RequireHttpsMetadata = false; // dev only, if needed
    //});

            //services.AddAuthorization();

            return services;
        }
    }
}