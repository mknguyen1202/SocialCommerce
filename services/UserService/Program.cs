using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

using UserService.Data;
using UserService.Services;

// BFF & Auth plumbing
using UserService.Auth.Abstractions;             // ITokenService
using UserService.Auth.Bff;                      // CookieSchemes + AddAppCookieAuthentication
using UserService.Auth.Bff.Csrf;                 // CSRF middleware + writer
using UserService.Auth.Authorization;            // AddAuthorizationWithPolicies()
using UserService.Auth.Options;                  // AddAuthOptionsFromConfig()
using UserService.Auth.Jwt;                      // AddApiJwtBearer() + JwtTokenService
using UserService.Auth.External.Core;            // ExternalLoginService + provider registry
using UserService.Auth.IdentityMapping;          // IExternalLoginLinkStore, IUserLinker, UserLinker, EfExternalLoginLinkStore

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ----------------- Data -----------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ----------------- Options -----------------
builder.Services.AddAuthOptionsFromConfig(builder.Configuration); // Auth/Google/Apple/Jwt bindings

// ----------------- Controllers/JSON -----------------
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// ----------------- CORS (only if SPA is on a different origin) -----------------
builder.Services.AddCors(o => o.AddPolicy("spa", p =>
    p.WithOrigins("https://localhost:5173")
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

// ----------------- Authentication (BFF cookies + Google) -----------------
// Registers App (session) + External (temp) cookie schemes
AuthenticationBuilder authBuilder = builder.Services.AddAppCookieAuthentication(o =>
{
    o.CrossSite = true; // set false if SPA and API are same origin
});

// Built-in Google handler (CallbackPath must match Google Console)
authBuilder.AddGoogle("Google", o =>
{
    o.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
    o.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
    o.SignInScheme = CookieSchemes.External;
    o.CallbackPath = "/auth/google/callback";   // matches both redirect URIs in Google Console
    o.SaveTokens = true;
    o.Scope.Add("email");
    o.Scope.Add("profile");
});

// Add other providers later the same way (Facebook/OpenIdConnect for Apple)

// External provider adapters + orchestrator used by MapAuthEndpoints()
builder.Services.AddExternalAuthProviders(builder.Configuration);
builder.Services.AddScoped<IExternalLoginLinkStore, EfExternalLoginLinkStore>();
builder.Services.AddScoped<IUserLinker, UserLinker>();
builder.Services.AddScoped<ILocalUserStore, EfLocalUserStore>();
builder.Services.AddSingleton<ExternalLoginService>();

// CSRF cookie writer (double-submit cookie strategy)
builder.Services.AddSingleton<ICsrfCookieWriter, CsrfCookieWriter>();

// ----------------- Authorization (policies/roles/permissions) -----------------
builder.Services.AddAuthorizationWithPolicies(); // uses PermissionHandler + PolicyNames

// ----------------- Optional: named JWT bearer for S2S/mobile -----------------
// Does NOT change the default cookie scheme. Use with [Authorize(AuthenticationSchemes="ApiJwt")]
builder.Services.AddApiJwtBearer(builder.Configuration); // expects Authentication:Jwt:* in config
builder.Services.AddSingleton<ITokenService, JwtTokenService>();

// ----------------- MediaService HTTP client -----------------
builder.Services.AddHttpClient<IMediaServiceClient, MediaServiceHttpClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["MediaService:BaseUrl"] ?? "http://localhost:5006");
});

// ----------------- Swagger -----------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "User Service", Version = "v1" });

    // Bearer scheme for S2S testing from Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ----------------- App -----------------
WebApplication app = builder.Build();

// Dev goodies
if (app.Environment.IsDevelopment())
{
    // Apply migrations
    using IServiceScope scope = app.Services.CreateScope();
    AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    app.UseSwagger();
    app.UseSwaggerUI();
}

// Pipeline order
app.UseCors("spa");            // if cross-origin
app.UseAuthentication();       // reads App.Auth cookie / ApiJwt tokens
app.UseCsrfDoubleSubmit();     // validates X-CSRF on writes
app.UseAuthorization();

app.MapAuthEndpoints();        // /auth/login/{provider}, /auth/callback/{provider}/signin, /auth/me, /auth/logout
app.MapControllers();

app.Run();
