using AuthorizationService.Bff;
using AuthorizationService.Infrastructure.HttpClients;
using AuthorizationService.Infrastructure.Persistence;
using AuthorizationService.Oidc;
using AuthorizationService.Oidc.Providers;
using AuthorizationService.Options;
using AuthorizationService.Security;
using AuthorizationService.Sessions;
using System;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
ConfigurationManager cfg = builder.Configuration;
IWebHostEnvironment env = builder.Environment;

// ----------------------------- Services -----------------------------

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // keep defaults (camelCase, etc.), add any converters here if you like
        o.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// Minimal API explorer + Swagger for dev
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (allow SPA origins from config: "Cors:AllowedOrigins": ["https://app.example.com"])
string[] allowedOrigins = cfg.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        else
            policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetIsOriginAllowed(_ => true);
    });
});

// Data Protection (persist keys if you set DataProtection:KeysDirectory)
builder.Services.AddDataProtection().PersistKeysToFileSystemIfConfigured(cfg);

// Distributed cache (dev: memory). For Redis, replace with AddStackExchangeRedisCache.
builder.Services.AddDistributedMemoryCache();


// Redis
builder.Services.AddStackExchangeRedisCache(o =>
{ 
    o.Configuration = builder.Configuration.GetConnectionString("Redis");
}); // Azure or local
string? cs = builder.Configuration.GetConnectionString("Redis");

builder.Services.AddSession(o => {
    o.IdleTimeout = TimeSpan.FromMinutes(60);
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Lax;
    o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});
builder.Services.AddScoped<ISessionStore, RedisSessionStore>(); // switch here


// Health checks (add DB check later if you want)
builder.Services.AddHealthChecks();

// ----------------------------- EF Core (PostgreSQL) -----------------------------
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    string cs = cfg.GetConnectionString("Default")
             ?? "Host=localhost;Port=5432;Database=auth_dev;Username=postgres;Password=postgres;Ssl Mode=Disable";
    opt.UseNpgsql(cs);
});

// ----------------------------- Options binding -----------------------------
builder.Services.Configure<SecurityOptions>(cfg.GetSection("Security"));
builder.Services.Configure<SessionCookieOptions>(cfg.GetSection("SessionCookie"));
builder.Services.Configure<ReturnUrlOptions>(cfg.GetSection("Auth:ReturnUrl"));

builder.Services.Configure<GoogleOptions>(cfg.GetSection("Auth:Google"));
builder.Services.Configure<MicrosoftOptions>(cfg.GetSection("Auth:Microsoft"));
builder.Services.Configure<FacebookOptions>(cfg.GetSection("Auth:Facebook"));
builder.Services.Configure<AppleOptions>(cfg.GetSection("Auth:Apple"));

builder.Services.Configure<BffProxyOptions>(cfg.GetSection("BffProxy"));
builder.Services.Configure<InternalJwtOptions>(cfg.GetSection("InternalJwt"));

// ----------------------------- Infrastructure -----------------------------
builder.Services.AddHttpClient(nameof(IdTokenValidator));
builder.Services.AddHttpClient(nameof(TokenExchangeService));
builder.Services.AddHttpClient(nameof(ProxyMiddleware));
builder.Services.AddHttpClient<ProviderHttpClient>();
builder.Services.AddTransient<IProviderHttpClient>(sp => sp.GetRequiredService<ProviderHttpClient>());

// ----------------------------- Core security services -----------------------------
builder.Services.AddMemoryCache();

builder.Services.AddSingleton<ICsrfService, CsrfService>();

// State/nonce stores (dev: in-memory; swap to Distributed* for Redis/SQL-backed IDistributedCache)
builder.Services.AddSingleton<IStateStore, InMemoryStateStore>();
builder.Services.AddSingleton<INonceStore, InMemoryNonceStore>();

// Return URL validator + URL encoder helper
builder.Services.AddSingleton<IReturnUrlValidator, DefaultReturnUrlValidator>();
builder.Services.AddSingleton<IUrlEncoder, DefaultUrlEncoder>();

// ----------------------------- OIDC services -----------------------------
builder.Services.AddSingleton<IPkceService, PkceService>();
builder.Services.AddSingleton<IIdTokenValidator, IdTokenValidator>();
builder.Services.AddSingleton<ITokenExchangeService, TokenExchangeService>();

// Providers + registry
builder.Services.AddSingleton<IProvider, GoogleProvider>();
builder.Services.AddSingleton<IProvider, MicrosoftProvider>();
builder.Services.AddSingleton<IProvider, FacebookProvider>();
builder.Services.AddSingleton<IProvider, AppleProvider>();
builder.Services.AddSingleton<IProviderRegistry, ProviderRegistry>();

// ----------------------------- Sessions -----------------------------
builder.Services.AddSingleton<ITokenProtector, DataProtectionTokenProtector>();
builder.Services.AddSingleton<ICookieIssuer, CookieIssuer>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

// Choose session store via config: "Sessions:UseEfCoreStore": true | false (default false)
bool useEfCoreSessions = cfg.GetValue("Sessions:UseEfCoreStore", false);
if (useEfCoreSessions)
{
    builder.Services.AddScoped<ISessionStore, EfCoreSessionStore>();
}
else
{
    builder.Services.AddSingleton<ISessionStore, InMemorySessionStore>();
}

// ----------------------------- BFF Proxy + Internal JWT -----------------------------
builder.Services.AddSingleton<IInternalJwtIssuer, DefaultInternalJwtIssuer>();
builder.Services.AddSingleton<IClaimsEnricher, ClaimsEnricher>();


#region App
// ----------------------------- Build app -----------------------------
WebApplication app = builder.Build();

// ----------------------------- Middleware pipeline -----------------------------

if (env.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// Forwarded headers (if behind a reverse proxy/ingress)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost,
    // KnownNetworks/KnownProxies can be configured here as needed
});

// HTTPS redirect
app.UseHttpsRedirection();

// CORS
app.UseCors("spa");

// (No cookie auth middleware — BFF uses HttpOnly session cookie you issue yourself)

// BFF reverse proxy: handles /api/* first; falls through to MVC for others
app.UseMiddleware<ProxyMiddleware>();


// Redis Session middleware
app.UseSession();
app.Logger.LogInformation("Redis connection string: {cs}", cs);


// Map controllers
app.MapControllers();

// Health
app.MapHealthChecks("/healthz");

// Root ping (optional)
app.MapGet("/", () => Results.Ok(new { service = "AuthorizationService", status = "ok" }));

app.Run();


#endregion App

// --------------------------- Helpers / Extensions ---------------------------

static class DataProtectionExtensions
{
    public static IDataProtectionBuilder PersistKeysToFileSystemIfConfigured(this IDataProtectionBuilder builder, IConfiguration cfg)
    {
        string? dir = cfg["DataProtection:KeysDirectory"];
        if (!string.IsNullOrWhiteSpace(dir))
        {
            Directory.CreateDirectory(dir);
            builder.PersistKeysToFileSystem(new DirectoryInfo(dir));
        }
        return builder;
    }
}
