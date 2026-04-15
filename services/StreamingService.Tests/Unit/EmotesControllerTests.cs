using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using StreamingService.Controllers;
using StreamingService.Data;
using StreamingService.Dtos;
using System.Security.Claims;
using Xunit;

namespace StreamingService.Tests.Unit;

public class EmotesControllerTests : IDisposable
{
    private readonly AppDbContext _db;

    public EmotesControllerTests()
    {
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
    }

    public void Dispose() => _db.Dispose();

    private EmotesController MakeController(Guid userId)
    {
        EmotesController controller = new EmotesController(_db);
        ClaimsIdentity identity = new ClaimsIdentity([new Claim("uid", userId.ToString())], "test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    private async Task<Theater> SeedTheater(Guid hostId)
    {
        Theater theater = new Theater
        {
            Id = Guid.NewGuid(),
            HostId = hostId,
            Title = "Test Theater",
            Category = "gaming",
            Tags = [],
            Visibility = "public",
            Status = "live",
            SourceType = "screen_share",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Theaters.Add(theater);
        await _db.SaveChangesAsync();
        return theater;
    }

    // ── Global Emotes ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGlobal_ReturnsOnlyGlobalEmotes()
    {
        _db.Emotes.AddRange(
            new Emote { Id = Guid.NewGuid(), Code = ":wave:", ImageUrl = "/wave.png", Category = "global", CreatedBy = Guid.NewGuid() },
            new Emote { Id = Guid.NewGuid(), Code = ":lol:", ImageUrl = "/lol.png", Category = "global", CreatedBy = Guid.NewGuid() },
            new Emote { Id = Guid.NewGuid(), Code = ":custom:", ImageUrl = "/c.png", Category = "theater", TheaterId = Guid.NewGuid(), CreatedBy = Guid.NewGuid() }
        );
        await _db.SaveChangesAsync();

        EmotesController controller = MakeController(Guid.NewGuid());
        ActionResult<IEnumerable<EmoteDto>> result = await controller.GetGlobal();

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        List<EmoteDto> emotes = ok.Value.Should().BeAssignableTo<List<EmoteDto>>().Subject;
        emotes.Should().HaveCount(2);
        emotes.Should().OnlyContain(e => e.Category == "global");
    }

    // ── Theater Emotes ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTheaterEmotes_ReturnsOnlyTheaterScopedEmotes()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        _db.Emotes.AddRange(
            new Emote { Id = Guid.NewGuid(), Code = ":hype:", ImageUrl = "/h.png", Category = "theater", TheaterId = theater.Id, CreatedBy = hostId },
            new Emote { Id = Guid.NewGuid(), Code = ":global:", ImageUrl = "/g.png", Category = "global", CreatedBy = Guid.NewGuid() }
        );
        await _db.SaveChangesAsync();

        EmotesController controller = MakeController(Guid.NewGuid());
        ActionResult<IEnumerable<EmoteDto>> result = await controller.GetTheaterEmotes(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        List<EmoteDto> emotes = ok.Value.Should().BeAssignableTo<List<EmoteDto>>().Subject;
        emotes.Should().HaveCount(1);
        emotes[0].Code.Should().Be(":hype:");
    }

    [Fact]
    public async Task GetTheaterEmotes_NonExistentTheater_ReturnsNotFound()
    {
        EmotesController controller = MakeController(Guid.NewGuid());

        ActionResult<IEnumerable<EmoteDto>> result = await controller.GetTheaterEmotes(Guid.NewGuid());

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    // ── Create Theater Emote ──────────────────────────────────────────────────

    [Fact]
    public async Task CreateTheaterEmote_AsHost_CreatesEmote()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        EmotesController controller = MakeController(hostId);

        ActionResult<EmoteDto> result = await controller.CreateTheaterEmote(
            theater.Id, new CreateEmoteDto(":fire:", "/fire.png"));

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        EmoteDto emote = ok.Value.Should().BeOfType<EmoteDto>().Subject;
        emote.Code.Should().Be(":fire:");
        emote.Category.Should().Be("theater");
        emote.TheaterId.Should().Be(theater.Id);
        emote.CreatedBy.Should().Be(hostId);
    }

    [Fact]
    public async Task CreateTheaterEmote_AsNonHost_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        EmotesController controller = MakeController(Guid.NewGuid());

        ActionResult<EmoteDto> result = await controller.CreateTheaterEmote(
            theater.Id, new CreateEmoteDto(":nope:", "/nope.png"));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task CreateTheaterEmote_NonExistentTheater_ReturnsNotFound()
    {
        EmotesController controller = MakeController(Guid.NewGuid());

        ActionResult<EmoteDto> result = await controller.CreateTheaterEmote(
            Guid.NewGuid(), new CreateEmoteDto(":sad:", "/sad.png"));

        result.Result.Should().BeOfType<NotFoundResult>();
    }
}