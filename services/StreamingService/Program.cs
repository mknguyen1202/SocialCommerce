using StreamingService.Auth;
using StreamingService.Data;
using StreamingService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddServiceJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

// ── Real-time publisher ───────────────────────────────────────────────────────
builder.Services.AddHttpClient<IRealTimePublisher, RealTimePublisher>(c =>
{
    string url = builder.Configuration["RealTimeHub:BaseUrl"] ?? "http://localhost:5007";
    c.BaseAddress = new Uri(url);
});

// ── MVC + OpenAPI ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "StreamingService", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
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

public partial class Program { }
