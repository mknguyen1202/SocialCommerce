using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Controllers;
using UserService.Data;
using UserService.Dtos;
using Xunit;

namespace UserService.Tests.Unit;

public class InternalUsersControllerTests
{
    private static AppDbContext MakeDb()
    {
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetById_UserDoesNotExist_ReturnsNotFound()
    {
        AppDbContext db = MakeDb();
        InternalUsersController sut = new InternalUsersController(db);

        ActionResult<InternalUserDto> result = await sut.GetById(Guid.NewGuid());

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetById_UserExists_ReturnsMappedInternalUserDto()
    {
        AppDbContext db = MakeDb();
        Guid userId = Guid.NewGuid();
        db.UserProfiles.Add(new UserProfile
        {
            Id = userId,
            IdentityId = "entra-oid-123",
            Username = "jane.doe",
            DisplayName = "Jane Doe",
            Email = "jane@example.com",
            AvatarUrl = "https://cdn.example.com/avatar.png",
            IsVendor = true
        });
        await db.SaveChangesAsync();

        InternalUsersController sut = new InternalUsersController(db);

        ActionResult<InternalUserDto> result = await sut.GetById(userId);

        OkObjectResult okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        InternalUserDto dto = okResult.Value.Should().BeOfType<InternalUserDto>().Subject;
        dto.Id.Should().Be(userId);
        dto.IdentityId.Should().Be("entra-oid-123");
        dto.Username.Should().Be("jane.doe");
        dto.DisplayName.Should().Be("Jane Doe");
        dto.Email.Should().Be("jane@example.com");
        dto.AvatarUrl.Should().Be("https://cdn.example.com/avatar.png");
        dto.IsVendor.Should().BeTrue();
    }
}
