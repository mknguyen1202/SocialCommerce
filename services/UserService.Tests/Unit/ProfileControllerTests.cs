using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using UserService.Controllers;
using UserService.Data;
using UserService.Dtos;
using UserService.Services;
using Xunit;

namespace UserService.Tests.Unit;

public class ProfileControllerTests
{
    private static AppDbContext MakeDb()
    {
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ProfileController MakeController(AppDbContext db, params Claim[] claims)
    {
        Mock<IMediaServiceClient> media = new Mock<IMediaServiceClient>();
        ProfileController controller = new ProfileController(db, media.Object);
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
    public async Task GetMe_NoClaims_ReturnsUnauthorized()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db);

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        result.Result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task GetMe_OidClaimPresent_UsesOidAsIdentity()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db,
            new Claim("oid", "entra-oid-123"),
            new Claim("sub", "sub-456"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ProfileReadDto dto = okResult.Value.Should().BeOfType<ProfileReadDto>().Subject;
        dto.IdentityId.Should().Be("entra-oid-123");
    }

    [Fact]
    public async Task GetMe_NoOidClaim_FallsBackToNameIdentifier()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db,
            new Claim(ClaimTypes.NameIdentifier, "nameidentifier-789"),
            new Claim("sub", "sub-456"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ProfileReadDto dto = okResult.Value.Should().BeOfType<ProfileReadDto>().Subject;
        dto.IdentityId.Should().Be("nameidentifier-789");
    }

    [Fact]
    public async Task GetMe_SubClaimOnly_UsesSubAsIdentity()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db,
            new Claim("sub", "sub-only-111"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ProfileReadDto dto = okResult.Value.Should().BeOfType<ProfileReadDto>().Subject;
        dto.IdentityId.Should().Be("sub-only-111");
    }

    [Fact]
    public async Task GetMe_OidPreferredOverNameIdentifierAndSub()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db,
            new Claim("oid", "oid-wins"),
            new Claim(ClaimTypes.NameIdentifier, "nameidentifier-loses"),
            new Claim("sub", "sub-loses"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ProfileReadDto dto = okResult.Value.Should().BeOfType<ProfileReadDto>().Subject;
        dto.IdentityId.Should().Be("oid-wins");
    }

    [Fact]
    public async Task GetMe_NewUser_AutoProvisionesProfile()
    {
        AppDbContext db = MakeDb();
        ProfileController sut = MakeController(db,
            new Claim("oid", "brand-new-oid-999"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        result.Result.Should().BeOfType<OkObjectResult>();
        UserProfile? profile = await db.UserProfiles
            .SingleOrDefaultAsync(p => p.IdentityId == "brand-new-oid-999");
        profile.Should().NotBeNull();
    }

    [Fact]
    public async Task GetMe_ExistingProfile_ReturnsStoredData()
    {
        AppDbContext db = MakeDb();
        db.UserProfiles.Add(new UserProfile
        {
            IdentityId = "existing-oid",
            Username = "johndoe",
            DisplayName = "John Doe"
        });
        await db.SaveChangesAsync();

        ProfileController sut = MakeController(db, new Claim("oid", "existing-oid"));

        ActionResult<ProfileReadDto> result = await sut.GetMe();

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ProfileReadDto dto = okResult.Value.Should().BeOfType<ProfileReadDto>().Subject;
        dto.Username.Should().Be("johndoe");
        dto.DisplayName.Should().Be("John Doe");
    }
}
