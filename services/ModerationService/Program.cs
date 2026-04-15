using Azure.Messaging.ServiceBus;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using ModerationService.Data;
using ModerationService.Services;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Db
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(cs));

// Redis (decision cache) optional
string? redisConn = builder.Configuration["Redis:Connection"];
if (!string.IsNullOrWhiteSpace(redisConn))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
    builder.Services.AddSingleton<IDecisionCache, RedisDecisionCache>();
}
else
{
    // basic in-memory fallback
    builder.Services.AddSingleton<IDecisionCache, InMemoryDecisionCache>();
}


// Health
builder.Services.AddHealthChecks().AddNpgSql(cs);

// OTEL
OpenTelemetryBuilder otel = builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation());
if (!string.IsNullOrWhiteSpace(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
    otel.UseAzureMonitor();

// Service Bus (conditional)
string? sbConn = builder.Configuration["ServiceBus:Connection"];
if (string.IsNullOrWhiteSpace(sbConn))
{
    builder.Services.AddSingleton<IBusPublisher, NoopBusPublisher>();
}
else
{
    builder.Services.AddSingleton(new ServiceBusClient(sbConn));
    builder.Services.AddScoped<IBusPublisher, BusPublisher>();
}

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new OpenApiInfo { Title = "ModerationService", Version = "v1" }));

WebApplication app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    AppDb db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapHealthChecks("/health/ready");
app.MapHealthChecks("/health/live");
app.MapControllers();
app.Run();


// inline in-memory cache impl
public class InMemoryDecisionCache : IDecisionCache
{
    private readonly Dictionary<string, (string action, DateTimeOffset? exp)> _m = new();
    private static string K(string t, Guid id) => $"{t}:{id}";
    public Task CacheDecisionAsync(string t, Guid id, string action, TimeSpan? ttl)
    { string key = K(t, id); _m[key] = (action, ttl.HasValue ? DateTimeOffset.UtcNow.Add(ttl.Value) : null); return Task.CompletedTask; }
    public Task<string?> GetDecisionAsync(string t, Guid id)
    { string key = K(t, id); if (_m.TryGetValue(key, out (string action, DateTimeOffset? exp) v) && (v.exp == null || v.exp > DateTimeOffset.UtcNow)) return Task.FromResult<string?>(v.action); _m.Remove(key); return Task.FromResult<string?>(null); }
    public Task InvalidateAsync(string t, Guid id) { _m.Remove(K(t, id)); return Task.CompletedTask; }
}
