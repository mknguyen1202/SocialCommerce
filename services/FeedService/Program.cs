using System.Text;
using Azure.Messaging.ServiceBus;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using FeedService.Data;
using FeedService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Db
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(cs));

// Redis
string? redisConn = builder.Configuration["Redis:Connection"];
if (!string.IsNullOrWhiteSpace(redisConn))
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
else
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect("localhost:6379,abortConnect=false"));

builder.Services.AddSingleton<ICache, RedisCache>();

// HttpClient for Graph
builder.Services.AddHttpClient<IGraphClient, GraphClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["GraphService:BaseUrl"] ?? "http://localhost:5005");
    c.Timeout = TimeSpan.FromSeconds(builder.Configuration.GetValue("GraphService:TimeoutSeconds", 30));
});

// HttpClient for SocialContent (group feed)
builder.Services.AddHttpClient<IContentClient, ContentClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["ContentService:BaseUrl"] ?? "http://localhost:5003");
    c.Timeout = TimeSpan.FromSeconds(builder.Configuration.GetValue("ContentService:TimeoutSeconds", 30));
});

// Event bus (optional in dev)
string? sbConn = builder.Configuration["ServiceBus:Connection"];
if (!string.IsNullOrWhiteSpace(sbConn))
{
    builder.Services.AddSingleton(new ServiceBusClient(sbConn));
    builder.Services.AddHostedService<EventSubscriber>();
}

// Health
builder.Services.AddHealthChecks().AddNpgSql(cs);

// OTEL
OpenTelemetryBuilder otel = builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation());
if (!string.IsNullOrWhiteSpace(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
    otel.UseAzureMonitor();

// AuthN/AuthZ
string jwtKey = builder.Configuration["Authentication:Jwt:SymmetricKey"] ?? "";
string jwtIssuer = builder.Configuration["Authentication:Jwt:Issuer"] ?? "SocialCommerce";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(o =>
{
    if (!string.IsNullOrWhiteSpace(jwtKey))
    {
        byte[] keyBytes = Encoding.UTF8.GetBytes(jwtKey);
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    }
});

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("social.read", p => p.RequireAuthenticatedUser());
    opts.AddPolicy("social.write", p => p.RequireAuthenticatedUser());
});

// Swagger
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FeedService", Version = "v1" });
});

// Domain services
builder.Services.AddScoped<IFeedBuilder, FeedBuilder>();

WebApplication app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    AppDb db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/ready");
app.MapHealthChecks("/health/live");
app.MapControllers();
app.Run();