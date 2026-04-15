using PresenceService.Auth;
using PresenceService.Endpoints;
using PresenceService.Services;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ── Redis ─────────────────────────────────────────────────────────────────────
string redisCs = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisCs));

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddServiceJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

// ── Real-time publisher ───────────────────────────────────────────────────────
builder.Services.AddHttpClient<IRealTimePublisher, RealTimePublisher>(c =>
{
    string url = builder.Configuration["RealTimeHub:BaseUrl"] ?? "http://localhost:5007";
    c.BaseAddress = new Uri(url);
});

// ── Domain services ───────────────────────────────────────────────────────────
builder.Services.AddScoped<PresenceRedisService>();

// ── OpenAPI ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "PresenceService", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});

builder.Services.AddProblemDetails();

WebApplication app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapPresenceEndpoints();
app.MapGet("/health/live", () => Results.Ok()).WithTags("Health");

app.Run();

internal partial class Program { }
