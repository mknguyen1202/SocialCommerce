using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace AuthorizationService.Infrastructure.Persistence.DesignTime;

/// <summary>
/// Enables 'dotnet ef' tooling to create the DbContext when running migrations.
/// It loads the same connection string as your app, falling back to an env var.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Try to read appsettings in the current directory
        var cfg = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var cs = cfg.GetConnectionString("Default")
                 ?? Environment.GetEnvironmentVariable("CONNECTION_STRING")
                 ?? "Host=localhost;Port=5432;Database=auth_dev;Username=postgres;Password=postgres;Ssl Mode=Disable";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs)
            .Options;

        return new AppDbContext(options);
    }
}
