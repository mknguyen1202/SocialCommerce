using MediaService.Auth;
using MediaService.Data;
using MediaService.Endpoints;
using MediaService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddServiceJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

// ── Blob storage ──────────────────────────────────────────────────────────────
bool useAzure = !string.IsNullOrEmpty(builder.Configuration["AzureStorage:ConnectionString"]);
if (useAzure)
    builder.Services.AddSingleton<IBlobStorage, AzureBlobStorage>();
else
    builder.Services.AddSingleton<IBlobStorage, LocalFileBlobStorage>();

// ── Domain services ───────────────────────────────────────────────────────────
builder.Services.AddScoped<IMediaUploadService, MediaUploadService>();

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MediaService", Version = "v1" });
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

// ── Problem Details ───────────────────────────────────────────────────────────
builder.Services.AddProblemDetails();

WebApplication app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // Serve local uploads as static files
    string uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
    Directory.CreateDirectory(uploadsPath);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads"
    });
    app.ApplyMigrationsOnStartup<AppDbContext>();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapMediaEndpoints();
app.MapGet("/health/live", () => Results.Ok()).WithTags("Health");

app.Run();

// ── Startup helpers ───────────────────────────────────────────────────────────
static class StartupExtensions
{
    public static WebApplication ApplyMigrationsOnStartup<TContext>(this WebApplication app)
        where TContext : Microsoft.EntityFrameworkCore.DbContext
    {
        using IServiceScope scope = app.Services.CreateScope();
        TContext db = scope.ServiceProvider.GetRequiredService<TContext>();
        db.Database.Migrate();
        return app;
    }
}
