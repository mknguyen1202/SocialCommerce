using Azure.Messaging.ServiceBus;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using SocialGraphService.Data;
using SocialGraphService.Services;


WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

string? sbConn = builder.Configuration["ServiceBus:Connection"];
if (string.IsNullOrWhiteSpace(sbConn))
{
    // Dev/no-bus: publish does nothing
    builder.Services.AddSingleton<IBusPublisher, NoopBusPublisher>();
}
else
{
    builder.Services.AddSingleton(new ServiceBusClient(sbConn));
    builder.Services.AddScoped<IBusPublisher, BusPublisher>();
}

string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(cs));

// Health
builder.Services.AddHealthChecks().AddNpgSql(cs);

// OTEL
OpenTelemetryBuilder otel = builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation());
if (!string.IsNullOrWhiteSpace(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
    otel.UseAzureMonitor();

// Service Bus (optional in dev)
// IBusPublisher is already registered above; no duplicate ServiceBusClient needed

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SocialGraphService", Version = "v1" });
});

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