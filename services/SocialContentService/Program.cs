using Azure.Messaging.ServiceBus;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using OpenTelemetry.Instrumentation.EntityFrameworkCore;
using SocialContentService.Data;
using SocialContentService.Services;


WebApplicationBuilder builder = WebApplication.CreateBuilder(args);


// DbContext
string cs = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDb>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
           .UseSnakeCaseNamingConvention());



// Health
builder.Services.AddHealthChecks().AddNpgSql(cs);


// AuthN/AuthZ
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(o =>
{
    o.Authority = builder.Configuration["Jwt:Authority"];
    o.Audience = builder.Configuration["Jwt:Audience"];
});


builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("social.read", p => p.RequireClaim("scp", "social.read").RequireAuthenticatedUser());
    opts.AddPolicy("social.write", p => p.RequireClaim("scp", "social.write").RequireAuthenticatedUser());
});


// Controllers
builder.Services.AddControllers();


// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SocialContentService", Version = "v1" });
    OpenApiSecurityScheme bearer = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme.",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", bearer);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { bearer, new List<string>() } });
});


// OpenTelemetry → Azure Monitor
builder.Services.AddOpenTelemetry()
    .WithTracing(tracer => tracer
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()   
    )
    .WithMetrics(meter => meter
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
    );


// Service Bus publisher (no-op when connection string is absent in dev)
string? sbConn = builder.Configuration["ServiceBus:Connection"];
if (!string.IsNullOrWhiteSpace(sbConn))
{
    builder.Services.AddSingleton(new ServiceBusClient(sbConn));
    builder.Services.AddScoped<IBusPublisher, BusPublisher>();
}
else
{
    builder.Services.AddSingleton<IBusPublisher, NoOpBusPublisher>();
}


WebApplication app = builder.Build();


if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(o =>
    {
        o.SwaggerEndpoint("/swagger/v1/swagger.json", "SocialContentService v1");
        o.DisplayRequestDuration();
    });
}


// Auto-migrate in dev
if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    AppDb db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();
}


app.MapHealthChecks("/health/ready");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();