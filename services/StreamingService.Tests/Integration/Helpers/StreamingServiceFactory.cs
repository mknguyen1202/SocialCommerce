using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StreamingService.Data;
using StreamingService.Services;
using Testcontainers.PostgreSql;
using Xunit;

namespace StreamingService.Tests.Integration.Helpers;

/// <summary>
/// Spins up the real StreamingService ASP.NET Core pipeline against a
/// Testcontainers PostgreSQL instance. Replaces:
/// <list type="bullet">
///   <item>AppDbContext connection string → Testcontainer</item>
///   <item>IRealTimePublisher → RecordingPublisher</item>
///   <item>JWT symmetric key → well-known test key</item>
/// </list>
/// </summary>
public sealed class StreamingServiceFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public RecordingPublisher Publisher { get; } = new RecordingPublisher();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", _postgres.GetConnectionString());
        builder.UseSetting("Authentication:Jwt:SymmetricKey", JwtTestHelper.TestSymmetricKey);
        builder.UseSetting("Authentication:Jwt:Issuer", JwtTestHelper.TestIssuer);
        builder.UseSetting("Internal:ApiKey", "test-internal-key");
        builder.UseSetting("RealTimeHub:BaseUrl", "http://localhost:9999");

        builder.ConfigureServices(services =>
        {
            // Replace IRealTimePublisher with the recording fake
            ServiceDescriptor? existingPublisher = services.SingleOrDefault(
                d => d.ServiceType == typeof(IRealTimePublisher));
            if (existingPublisher is not null)
                services.Remove(existingPublisher);

            // Also remove the named HttpClient for RealTimePublisher
            ServiceDescriptor? httpClientFactory = services.SingleOrDefault(
                d => d.ServiceType.FullName?.Contains("IHttpClientFactory") == true);

            services.AddSingleton<IRealTimePublisher>(Publisher);
        });
    }

    /// <summary>Creates an HttpClient with a valid JWT for <paramref name="userId"/>.</summary>
    public HttpClient CreateClientWithIdentity(Guid userId)
    {
        HttpClient client = CreateClient();
        string token = JwtTestHelper.IssueToken(userId);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        using IServiceScope scope = Services.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }
}
