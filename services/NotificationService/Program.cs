using NotificationService.Auth;
using NotificationService.Data;
using NotificationService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));

// ── Redis ─────────────────────────────────────────────────────────────────────
string redisCs = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
IConnectionMultiplexer redis = ConnectionMultiplexer.Connect(redisCs);
builder.Services.AddSingleton(redis);

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddServiceJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

// ── Real-time publisher ───────────────────────────────────────────────────────
builder.Services.AddHttpClient<IRealTimePublisher, RealTimePublisher>(c =>
{
    string url = builder.Configuration["RealTimeHub:BaseUrl"] ?? "http://localhost:5007";
    c.BaseAddress = new Uri(url);
});

// ── Event subscriber (hosted service) ─────────────────────────────────────────
builder.Services.AddHostedService<EventSubscriber>();

// ── MVC + OpenAPI ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "NotificationService", Version = "v1" });
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
    using IServiceScope scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health/live", () => Results.Ok()).WithTags("Health");

app.Run();

internal partial class Program { }
