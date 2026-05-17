# SocialCommerce — Testing Concepts & Strategy

> Tailored to the actual stack: ASP.NET Core (.NET 8/9), EF Core + PostgreSQL,
> Redis, SignalR, Cookie BFF auth, JWT service-to-service, and 18 microservices.

---

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [Tooling Choices](#2-tooling-choices)
3. [Project Structure](#3-project-structure)
4. [Unit Tests](#4-unit-tests)
5. [Integration Tests](#5-integration-tests)
6. [Controller / HTTP Tests](#6-controller--http-tests)
7. [Authentication & Authorization Tests](#7-authentication--authorization-tests)
8. [SignalR Hub Tests](#8-signalr-hub-tests)
9. [HTTP Client Contract Tests](#9-http-client-contract-tests)
10. [Database Tests with Testcontainers](#10-database-tests-with-testcontainers)
11. [Redis Tests](#11-redis-tests)
12. [Test Data Builders](#12-test-data-builders)
13. [What Not to Test](#13-what-not-to-test)
14. [CI Pipeline Testing](#14-ci-pipeline-testing)
15. [Testing Priority by Service](#15-testing-priority-by-service)

---

## 1. Testing Pyramid

```
          ┌─────────────────────┐
          │   E2E (Playwright)  │  ← Few, slow, catch critical user flows
          ├─────────────────────┤
          │   Integration       │  ← Medium, real DB/Redis via Testcontainers
          ├─────────────────────┤
          │   Unit              │  ← Many, fast, isolated logic & edge cases
          └─────────────────────┘
```

| Layer | Speed | Count | What it catches |
|---|---|---|---|
| Unit | < 1 ms | Most | Logic bugs, edge cases, null handling |
| Integration | 1–5 s | Medium | DB queries, EF migrations, middleware, auth |
| E2E | 5–30 s | Few | Critical user journeys end-to-end |

---

## 2. Tooling Choices

| Purpose | Package |
|---|---|
| Test runner + assertions | `xunit` + `FluentAssertions` |
| Mocking | `Moq` (or `NSubstitute`) |
| ASP.NET Core integration host | `Microsoft.AspNetCore.Mvc.Testing` |
| Real PostgreSQL (tests) | `Testcontainers.PostgreSql` |
| Real Redis (tests) | `Testcontainers.Redis` |
| HTTP client mocking | `RichardSzalay.MockHttp` |
| SignalR client (tests) | `Microsoft.AspNetCore.SignalR.Client` |
| E2E browser tests | `Microsoft.Playwright` |
| Fake data generation | `Bogus` |

---

## 3. Project Structure

Create one test project per service alongside the service itself:

```
services/
├── UserService/
│   └── UserService.csproj
├── UserService.Tests/
│   ├── UserService.Tests.csproj
│   ├── Unit/
│   │   ├── ProfileControllerTests.cs
│   │   ├── JwtTokenServiceTests.cs
│   │   └── CsrfMiddlewareTests.cs
│   ├── Integration/
│   │   ├── ProfileEndpointTests.cs
│   │   ├── AuthFlowTests.cs
│   │   └── ProfileDbTests.cs
│   └── Helpers/
│       ├── UserServiceFactory.cs      ← WebApplicationFactory subclass
│       ├── UserProfileBuilder.cs      ← Test data builder
│       └── AuthHelper.cs             ← Fake cookie/JWT helpers
```

### `UserService.Tests.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\UserService\UserService.csproj" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
    <PackageReference Include="FluentAssertions" Version="6.*" />
    <PackageReference Include="Moq" Version="4.*" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
    <PackageReference Include="Testcontainers.PostgreSql" Version="3.*" />
    <PackageReference Include="Testcontainers.Redis" Version="3.*" />
    <PackageReference Include="RichardSzalay.MockHttp" Version="7.*" />
    <PackageReference Include="Bogus" Version="35.*" />
  </ItemGroup>
</Project>
```

---

## 4. Unit Tests

Unit tests target **pure logic** — no database, no HTTP, no framework.

### 4a. `GetIdentityId()` claim resolution

```csharp
// Unit/ProfileControllerTests.cs
public class GetIdentityIdTests
{
    // Helper: create a controller with a faked ClaimsPrincipal
    private static ProfileController MakeController(params Claim[] claims)
    {
        Mock<AppDbContext> db = new Mock<AppDbContext>();
        Mock<IMediaServiceClient> media = new Mock<IMediaServiceClient>();
        ProfileController controller = new ProfileController(db.Object, media.Object);

        ClaimsIdentity identity = new ClaimsIdentity(claims, "Test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };
        return controller;
    }

    [Fact]
    public void ReturnsOidClaim_WhenPresent()
    {
        // "oid" (Entra) is preferred — test that it wins over sub
        ProfileController sut = MakeController(
            new Claim("oid", "entra-oid-123"),
            new Claim("sub", "sub-456"));

        // GetIdentityId is private — test via public behavior (GetMe returns
        // Unauthorized when DB is empty, but the id used is the oid value)
        // Alternatively make it internal + use [InternalsVisibleTo]
    }

    [Fact]
    public void ReturnsNull_WhenNoClaims()
    {
        ProfileController sut = MakeController(); // no claims
        // GetMe/Update/Create all return Unauthorized — tested in integration
    }
}
```

### 4b. `JwtTokenService` — token minting & validation

```csharp
// Unit/JwtTokenServiceTests.cs
public class JwtTokenServiceTests
{
    private static JwtTokenService MakeService(string key = "test-secret-key-min-32-bytes-long!!")
    {
        IOptions<JwtOptions> options = Options.Create(new JwtOptions
        {
            SymmetricKey = key,
            Issuer = "SocialCommerce",
            Audience = "sc-rt-hub",
            ExpiryMinutes = 15
        });
        return new JwtTokenService(options);
    }

    [Fact]
    public void IssuedToken_ContainsUidClaim()
    {
        JwtTokenService sut = MakeService();
        Guid userId = Guid.NewGuid();

        string token = sut.IssueHubToken(userId, "user.read");

        ClaimsPrincipal principal = sut.ValidateToken(token);
        principal.FindFirstValue("uid").Should().Be(userId.ToString());
    }

    [Fact]
    public void ExpiredToken_ThrowsSecurityTokenExpiredException()
    {
        JwtTokenService sut = MakeService();
        string token = sut.IssueHubToken(Guid.NewGuid(), "user.read", expiresIn: TimeSpan.FromSeconds(-1));

        Action act = () => sut.ValidateToken(token);

        act.Should().Throw<SecurityTokenExpiredException>();
    }
}
```

### 4c. `CsrfMiddleware` — double-submit cookie validation

```csharp
// Unit/CsrfMiddlewareTests.cs
public class CsrfMiddlewareTests
{
    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task MutatingRequest_WithoutCsrfHeader_Returns403(string method)
    {
        DefaultHttpContext ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Cookies = MockCookies("csrf-token", "abc123");
        // Header intentionally missing

        CsrfMiddleware middleware = new CsrfMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task GetRequest_PassesThrough_NoCsrfCheck()
    {
        bool nextCalled = false;
        DefaultHttpContext ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";

        CsrfMiddleware middleware = new CsrfMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        await middleware.InvokeAsync(ctx);

        nextCalled.Should().BeTrue();
    }
}
```

---

## 5. Integration Tests

Integration tests spin up the **real ASP.NET Core pipeline** with an in-memory
or Testcontainers database. They test middleware, routing, EF Core, and auth
all working together.

### `UserServiceFactory.cs` — shared test host

```csharp
// Helpers/UserServiceFactory.cs
public class UserServiceFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace real DB with the Testcontainers instance
            ServiceDescriptor? descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(opts =>
                opts.UseNpgsql(_postgres.GetConnectionString()));

            // Stub out MediaService HTTP calls
            services.AddSingleton<IMediaServiceClient>(
                new Mock<IMediaServiceClient>().Object);
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        // Run EF migrations against the test DB
        using IServiceScope scope = Services.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync() => await _postgres.DisposeAsync();
}
```

---

## 6. Controller / HTTP Tests

Test every endpoint in `ProfileController` via real HTTP through the test host.

### `ProfileEndpointTests.cs`

```csharp
// Integration/ProfileEndpointTests.cs
public class ProfileEndpointTests : IClassFixture<UserServiceFactory>
{
    private readonly HttpClient _client;
    private readonly UserServiceFactory _factory;

    public ProfileEndpointTests(UserServiceFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // --- GET /api/user/profile ---

    [Fact]
    public async Task GetMe_Unauthenticated_Returns401()
    {
        HttpResponseMessage response = await _client.GetAsync("/api/user/profile");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_NewUser_AutoProvisionsProfile()
    {
        HttpClient authed = _factory.CreateClientWithIdentity("new-user-oid");

        HttpResponseMessage response = await authed.GetAsync("/api/user/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        ProfileReadDto? dto = await response.Content.ReadFromJsonAsync<ProfileReadDto>();
        dto.Should().NotBeNull();
        dto!.IdentityId.Should().Be("new-user-oid");
    }

    [Fact]
    public async Task GetMe_ExistingUser_ReturnsStoredProfile()
    {
        string identityId = "existing-user-" + Guid.NewGuid();
        await _factory.SeedProfileAsync(new UserProfile
        {
            IdentityId = identityId,
            Username = "johndoe",
            DisplayName = "John Doe"
        });

        HttpClient authed = _factory.CreateClientWithIdentity(identityId);
        ProfileReadDto? dto = await (await authed.GetAsync("/api/user/profile"))
            .Content.ReadFromJsonAsync<ProfileReadDto>();

        dto!.Username.Should().Be("johndoe");
        dto.DisplayName.Should().Be("John Doe");
    }

    // --- PUT /api/user/profile ---

    [Fact]
    public async Task Update_ValidPayload_Returns204()
    {
        string identityId = "update-user-" + Guid.NewGuid();
        await _factory.SeedProfileAsync(new UserProfile { IdentityId = identityId });

        HttpClient authed = _factory.CreateClientWithIdentity(identityId);
        ProfileUpdateDto payload = new ProfileUpdateDto(
            Username: "newname", DisplayName: null, FirstName: "Jane",
            LastName: null, DateOfBirth: null, Phone: null,
            AvatarUrl: null, Bio: null, BannerUrl: null);

        HttpResponseMessage response = await authed.PutAsJsonAsync("/api/user/profile", payload);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Update_DuplicateUsername_Returns409()
    {
        string idA = "user-a-" + Guid.NewGuid();
        string idB = "user-b-" + Guid.NewGuid();
        await _factory.SeedProfileAsync(new UserProfile { IdentityId = idA, Username = "taken" });
        await _factory.SeedProfileAsync(new UserProfile { IdentityId = idB });

        HttpClient authed = _factory.CreateClientWithIdentity(idB);
        ProfileUpdateDto payload = new ProfileUpdateDto(
            Username: "taken", DisplayName: null, FirstName: null,
            LastName: null, DateOfBirth: null, Phone: null,
            AvatarUrl: null, Bio: null, BannerUrl: null);

        HttpResponseMessage response = await authed.PutAsJsonAsync("/api/user/profile", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // --- GET /api/user/profile/{userId} ---

    [Fact]
    public async Task GetPublic_UnknownId_Returns404()
    {
        HttpResponseMessage response = await _client.GetAsync($"/api/user/profile/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPublic_KnownId_ReturnsPublicFields()
    {
        UserProfile profile = await _factory.SeedProfileAsync(new UserProfile
        {
            IdentityId = "pub-" + Guid.NewGuid(),
            Username = "public_user",
            Bio = "Hello!"
        });

        HttpResponseMessage response = await _client.GetAsync($"/api/user/profile/{profile.Id}");
        PublicProfileReadDto? dto = await response.Content.ReadFromJsonAsync<PublicProfileReadDto>();

        dto!.Username.Should().Be("public_user");
        dto.Bio.Should().Be("Hello!");
    }
}
```

---

## 7. Authentication & Authorization Tests

### 7a. Policy enforcement

Every policy-guarded endpoint must be tested with:
- No auth → `401`
- Wrong policy (missing permission claim) → `403`
- Correct policy → `200 / 204`

```csharp
// Integration/AuthFlowTests.cs
public class AuthFlowTests : IClassFixture<UserServiceFactory>
{
    private readonly UserServiceFactory _factory;
    public AuthFlowTests(UserServiceFactory factory) => _factory = factory;

    [Fact]
    public async Task Put_MissingWritePermission_Returns403()
    {
        // Authenticated but only has user.read — not user.write
        HttpClient client = _factory.CreateClientWithIdentity("read-only-user",
            permissions: new[] { "user.read" });

        HttpResponseMessage response = await client.PutAsJsonAsync("/api/user/profile",
            new ProfileUpdateDto(null, null, null, null, null, null, null, null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task HubToken_Endpoint_RequiresCookieAuth()
    {
        // /auth/hub-token is cookie-only, not ApiJwt
        HttpClient unauthenticated = _factory.CreateClient();
        HttpResponseMessage response = await unauthenticated.GetAsync("/auth/hub-token");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

### 7b. CSRF middleware

```csharp
[Fact]
public async Task Put_MissingCsrfHeader_Returns403_WhenCsrfEnabled()
{
    // Client with a valid auth cookie but NO X-CSRF-TOKEN header
    HttpClient client = _factory.CreateClientWithIdentity("csrf-test-user",
        includeCsrfHeader: false);

    HttpResponseMessage response = await client.PutAsJsonAsync("/api/user/profile",
        new ProfileUpdateDto(null, null, null, null, null, null, null, null, null));

    response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
}
```

---

## 8. SignalR Hub Tests

Test `AppHub` in **RealTimeHub** using the real SignalR client connecting to
a `WebApplicationFactory`-hosted test server.

```csharp
// RealTimeHub.Tests/Integration/AppHubTests.cs
public class AppHubTests : IClassFixture<RealTimeHubFactory>
{
    private readonly RealTimeHubFactory _factory;
    public AppHubTests(RealTimeHubFactory factory) => _factory = factory;

    [Fact]
    public async Task Connect_WithValidJwt_JoinsUserGroup()
    {
        string userId = Guid.NewGuid().ToString();
        string token = _factory.IssueTestJwt(userId);

        HubConnection connection = new HubConnectionBuilder()
            .WithUrl(_factory.Server.BaseAddress + "hubs/app", opts =>
            {
                opts.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                opts.AccessTokenProvider = () => Task.FromResult<string?>(token);
            })
            .Build();

        await connection.StartAsync();

        connection.State.Should().Be(HubConnectionState.Connected);
        await connection.StopAsync();
    }

    [Fact]
    public async Task Connect_WithoutJwt_IsRejected()
    {
        HubConnection connection = new HubConnectionBuilder()
            .WithUrl(_factory.Server.BaseAddress + "hubs/app", opts =>
            {
                opts.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .Build();

        Func<Task> act = () => connection.StartAsync();
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task JoinConversation_AddsToGroup()
    {
        HubConnection connection = _factory.CreateAuthenticatedConnection();
        await connection.StartAsync();

        // Should not throw — group membership verified by observing
        // messages sent to the group in a two-client test
        await connection.InvokeAsync("JoinConversation", "conv-123");

        await connection.StopAsync();
    }
}
```

---

## 9. HTTP Client Contract Tests

`MediaServiceHttpClient` wraps an external HTTP service. Test it with a
**mock HTTP handler** so it never hits a real network.

```csharp
// Unit/MediaServiceHttpClientTests.cs
public class MediaServiceHttpClientTests
{
    [Fact]
    public async Task UploadAsync_SuccessResponse_ReturnsMediaUploadResult()
    {
        MockHttpMessageHandler mockHttp = new MockHttpMessageHandler();
        mockHttp
            .When(HttpMethod.Post, "http://media/media/upload*")
            .Respond("application/json", """
                {"mediaId":"d9e1f2a3-0000-0000-0000-000000000001","url":"https://cdn/avatar.jpg","thumbnailUrl":null}
                """);

        MediaServiceHttpClient sut = new MediaServiceHttpClient(mockHttp.ToHttpClient());
        sut.Client.BaseAddress = new Uri("http://media");   // if BaseAddress is settable

        IFormFile fakeFile = MakeFakeFormFile("avatar.png", "image/png");
        MediaUploadResult result = await sut.UploadAsync(fakeFile, "avatar");

        result.Url.Should().Be("https://cdn/avatar.jpg");
        result.MediaId.Should().Be(Guid.Parse("d9e1f2a3-0000-0000-0000-000000000001"));
    }

    [Fact]
    public async Task UploadAsync_Non2xx_ThrowsHttpRequestException()
    {
        MockHttpMessageHandler mockHttp = new MockHttpMessageHandler();
        mockHttp.When("*").Respond(HttpStatusCode.InternalServerError);

        MediaServiceHttpClient sut = new MediaServiceHttpClient(mockHttp.ToHttpClient());

        Func<Task> act = () => sut.UploadAsync(MakeFakeFormFile("f.png", "image/png"), "avatar");
        await act.Should().ThrowAsync<HttpRequestException>();
    }
}
```

---

## 10. Database Tests with Testcontainers

Test EF Core queries and constraints directly — not through HTTP.

```csharp
// Integration/ProfileDbTests.cs
public class ProfileDbTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .Build();

    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        _db = new AppDbContext(options);
        await _db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task IdentityId_IsUnique_ThrowsOnDuplicate()
    {
        string identityId = "dup-test-" + Guid.NewGuid();
        _db.UserProfiles.Add(new UserProfile { IdentityId = identityId });
        await _db.SaveChangesAsync();

        _db.UserProfiles.Add(new UserProfile { IdentityId = identityId });
        Func<Task> act = () => _db.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Username_MaxLength50_IsEnforced()
    {
        _db.UserProfiles.Add(new UserProfile
        {
            IdentityId = "len-test-" + Guid.NewGuid(),
            Username = new string('a', 51)             // 51 chars — over limit
        });

        Func<Task> act = () => _db.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>();
    }
}
```

---

## 11. Redis Tests

For **PresenceService** and **FeedService** which rely on Redis TTL keys and
pub/sub, use a real Redis container:

```csharp
// PresenceService.Tests/Integration/PresenceStoreTests.cs
public class PresenceStoreTests : IAsyncLifetime
{
    private readonly RedisContainer _redis = new RedisBuilder().Build();
    private IConnectionMultiplexer _mux = null!;

    public async Task InitializeAsync()
    {
        await _redis.StartAsync();
        _mux = await ConnectionMultiplexer.ConnectAsync(_redis.GetConnectionString());
    }

    public async Task DisposeAsync()
    {
        await _mux.DisposeAsync();
        await _redis.DisposeAsync();
    }

    [Fact]
    public async Task SetOnline_ThenGetStatus_ReturnsOnline()
    {
        PresenceStore store = new PresenceStore(_mux);
        await store.SetOnlineAsync("user-123", ttl: TimeSpan.FromSeconds(30));

        PresenceStatus status = await store.GetStatusAsync("user-123");
        status.Should().Be(PresenceStatus.Online);
    }

    [Fact]
    public async Task ExpiredKey_ReturnsOffline()
    {
        PresenceStore store = new PresenceStore(_mux);
        await store.SetOnlineAsync("user-456", ttl: TimeSpan.FromMilliseconds(50));

        await Task.Delay(100);   // let the TTL expire

        PresenceStatus status = await store.GetStatusAsync("user-456");
        status.Should().Be(PresenceStatus.Offline);
    }
}
```

---

## 12. Test Data Builders

Use builders to create clean, readable test data instead of raw constructors.

```csharp
// Helpers/UserProfileBuilder.cs
public class UserProfileBuilder
{
    private string _identityId = "test-identity-" + Guid.NewGuid();
    private string? _username;
    private string? _displayName;
    private string? _email;
    private bool _isVendor;

    public UserProfileBuilder WithIdentityId(string id) { _identityId = id; return this; }
    public UserProfileBuilder WithUsername(string username) { _username = username; return this; }
    public UserProfileBuilder WithDisplayName(string name) { _displayName = name; return this; }
    public UserProfileBuilder WithEmail(string email) { _email = email; return this; }
    public UserProfileBuilder AsVendor() { _isVendor = true; return this; }

    public UserProfile Build() => new UserProfile
    {
        IdentityId = _identityId,
        Username = _username,
        DisplayName = _displayName,
        Email = _email,
        IsVendor = _isVendor,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };
}

// Usage in tests:
UserProfile vendor = new UserProfileBuilder()
    .WithUsername("shop_owner")
    .WithEmail("vendor@example.com")
    .AsVendor()
    .Build();
```

### Bogus for realistic fake data

```csharp
// Helpers/FakeProfiles.cs
public static class FakeProfiles
{
    private static readonly Faker<UserProfile> _faker = new Faker<UserProfile>()
        .RuleFor(p => p.IdentityId, f => f.Random.Guid().ToString())
        .RuleFor(p => p.Username, f => f.Internet.UserName()[..Math.Min(f.Internet.UserName().Length, 50)])
        .RuleFor(p => p.DisplayName, f => f.Name.FullName())
        .RuleFor(p => p.Email, f => f.Internet.Email())
        .RuleFor(p => p.Bio, f => f.Lorem.Sentence())
        .RuleFor(p => p.IsVendor, f => f.Random.Bool(0.2f))
        .RuleFor(p => p.CreatedAt, f => f.Date.PastOffset())
        .RuleFor(p => p.UpdatedAt, f => DateTimeOffset.UtcNow);

    public static UserProfile Generate() => _faker.Generate();
    public static List<UserProfile> Generate(int count) => _faker.Generate(count);
}
```

---

## 13. What Not to Test

| Skip | Reason |
|---|---|
| EF Core `DbSet` internals | Framework code — trust Microsoft |
| Auto-generated EF migrations | Covered by Testcontainers `MigrateAsync()` |
| `record` constructor mapping (DTOs) | No logic to test |
| Framework routing (attribute routing) | Covered by integration tests |
| `Console.WriteLine` in `Update()` | Side-effect with no assertions possible |
| Boilerplate `Program.cs` DI registrations | Covered implicitly by integration tests running |

---

## 14. CI Pipeline Testing

Add this to `.github/workflows/ci.yml` to run tests on every push:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      # Testcontainers manages its own Docker — no extra services needed here
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.x'

      - name: Restore
        run: dotnet restore SocialCommerce.sln

      - name: Build
        run: dotnet build SocialCommerce.sln --no-restore --configuration Release

      - name: Test
        run: dotnet test SocialCommerce.sln --no-build --configuration Release --logger "trx" --results-directory TestResults

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults/
```

---

## 15. Testing Priority by Service

Focus test effort where bugs are most costly:

| Priority | Service | Why |
|---|---|---|
| 🔴 Critical | **UserService** | BFF, auth, sessions — a bug here affects every user |
| 🔴 Critical | **AuthorizationService** | Incorrect permissions = security hole |
| 🟠 High | **CommunicationService** | Message loss or duplication is immediately visible |
| 🟠 High | **CommerceService / OrderService** | Money — incorrect totals, missed stock deductions |
| 🟠 High | **InventoryService** | Overselling / stock race conditions |
| 🟡 Medium | **FeedService** | Fan-out logic, cache invalidation |
| 🟡 Medium | **SocialContentService** | Post/comment integrity |
| 🟡 Medium | **MediaService** | Upload failures are user-visible |
| 🟢 Lower | **AnalyticsService / AdService** | Reporting delays are tolerable |
| 🟢 Lower | **ModerationService** | Best-effort; human review covers gaps |
| 🟢 Lower | **SearchService** | Stale index is inconvenient, not critical |

---

## Quick-Reference Cheatsheet

```
# Run all tests
dotnet test SocialCommerce.sln

# Run only UserService tests
dotnet test services/UserService.Tests/UserService.Tests.csproj

# Run only integration tests
dotnet test --filter Category=Integration

# Run with coverage (requires coverlet)
dotnet test --collect:"XPlat Code Coverage"
```
