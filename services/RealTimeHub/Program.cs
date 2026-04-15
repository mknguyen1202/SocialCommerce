using Microsoft.AspNetCore.SignalR;
using RealTimeHub.Auth;
using RealTimeHub.Endpoints;
using RealTimeHub.Hubs;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddHubJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

// ── SignalR + Redis backplane ──────────────────────────────────────────────────
string redisConn = builder.Configuration["Redis:Connection"] ?? "localhost:6379,abortConnect=false";
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConn, opts =>
    {
        opts.Configuration.ChannelPrefix = global::StackExchange.Redis.RedisChannel.Literal("sc-rt");
    });

// Custom IUserIdProvider: maps "uid" claim → SignalR user identifier
builder.Services.AddSingleton<IUserIdProvider, UidUserIdProvider>();

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Problem Details ───────────────────────────────────────────────────────────
builder.Services.AddProblemDetails();

// ── CORS ──────────────────────────────────────────────────────────────────────
string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

WebApplication app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseExceptionHandler();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ─────────────────────────────────────────────────────────────────
string internalApiKey = builder.Configuration["Internal:ApiKey"] ?? "sc-dev-internal-api-key";
app.MapInternalEndpoints(internalApiKey);

app.MapHub<AppHub>("/hubs/app");
app.MapGet("/health/live", () => Results.Ok()).WithTags("Health");

app.Run();
