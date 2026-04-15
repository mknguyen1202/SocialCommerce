using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using StreamingService.Controllers;
using StreamingService.Data;
using StreamingService.Dtos;
using StreamingService.Services;
using System.Security.Claims;
using Xunit;

namespace StreamingService.Tests.Unit;

public class TheatersControllerTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IRealTimePublisher> _rt;

    public TheatersControllerTests()
    {
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _rt = new Mock<IRealTimePublisher>();
    }

    public void Dispose() => _db.Dispose();

    private TheatersController MakeController(Guid userId)
    {
        TheatersController controller = new TheatersController(_db, _rt.Object);
        ClaimsIdentity identity = new ClaimsIdentity([new Claim("uid", userId.ToString())], "test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    private static CreateTheaterDto MakeCreateDto(
        string title = "Movie Night",
        string? scheduledAt = null) => new(
        Title: title,
        Description: "Watch party",
        Category: "movies",
        Tags: ["fun", "weekend"],
        Visibility: "public",
        SourceType: "external_url",
        SourceUrl: "https://example.com/stream",
        SourceMediaId: null,
        MaxViewers: 50,
        ScheduledAt: scheduledAt is null ? null : DateTimeOffset.Parse(scheduledAt));

    private async Task<Theater> SeedTheater(
        Guid hostId,
        string status = "created",
        string visibility = "public")
    {
        Theater theater = new Theater
        {
            Id = Guid.NewGuid(),
            HostId = hostId,
            Title = "Seed Theater",
            Category = "gaming",
            Tags = ["seed"],
            Visibility = visibility,
            Status = status,
            SourceType = "screen_share",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Theaters.Add(theater);

        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id,
            UserId = hostId,
            Role = "host",
            JoinedAt = DateTimeOffset.UtcNow
        });

        _db.PlaybackStates.Add(new PlaybackState
        {
            TheaterId = theater.Id,
            PositionSeconds = 0,
            IsPlaying = false,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return theater;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ReturnsCreatedWithTheaterDto()
    {
        Guid hostId = Guid.NewGuid();
        TheatersController controller = MakeController(hostId);
        CreateTheaterDto dto = MakeCreateDto();

        ActionResult<TheaterDto> result = await controller.Create(dto);

        CreatedAtActionResult created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        TheaterDto theater = created.Value.Should().BeOfType<TheaterDto>().Subject;
        theater.Title.Should().Be("Movie Night");
        theater.HostId.Should().Be(hostId);
        theater.Status.Should().Be("created");
        theater.Visibility.Should().Be("public");
    }

    [Fact]
    public async Task Create_WithScheduledAt_SetsStatusToScheduled()
    {
        Guid hostId = Guid.NewGuid();
        TheatersController controller = MakeController(hostId);
        CreateTheaterDto dto = MakeCreateDto(scheduledAt: "2026-04-01T20:00:00Z");

        ActionResult<TheaterDto> result = await controller.Create(dto);

        CreatedAtActionResult created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        TheaterDto theater = created.Value.Should().BeOfType<TheaterDto>().Subject;
        theater.Status.Should().Be("scheduled");
        theater.ScheduledAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Create_AddsHostParticipantAndPlaybackState()
    {
        Guid hostId = Guid.NewGuid();
        TheatersController controller = MakeController(hostId);

        await controller.Create(MakeCreateDto());

        Theater theater = await _db.Theaters.FirstAsync();
        TheaterParticipant? participant = await _db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theater.Id && p.UserId == hostId);
        participant.Should().NotBeNull();
        participant!.Role.Should().Be("host");

        PlaybackState? playback = await _db.PlaybackStates.FirstOrDefaultAsync(p => p.TheaterId == theater.Id);
        playback.Should().NotBeNull();
        playback!.IsPlaying.Should().BeFalse();
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_ExistingTheater_ReturnsOk()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Get(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto dto = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        dto.Id.Should().Be(theater.Id);
    }

    [Fact]
    public async Task Get_NonExistentTheater_ReturnsNotFound()
    {
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<TheaterDto> result = await controller.Get(Guid.NewGuid());

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_AsHost_AppliesPartialUpdate()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);
        UpdateTheaterDto dto = new(Title: "New Title", Description: null, Tags: null);

        ActionResult<TheaterDto> result = await controller.Update(theater.Id, dto);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto updated = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        updated.Title.Should().Be("New Title");
    }

    [Fact]
    public async Task Update_AsNonHost_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Guid otherUser = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(otherUser);

        ActionResult<TheaterDto> result = await controller.Update(theater.Id, new(null, null, null));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Update_NonExistentTheater_ReturnsNotFound()
    {
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<TheaterDto> result = await controller.Update(Guid.NewGuid(), new(null, null, null));

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    // ── Start ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("created")]
    [InlineData("scheduled")]
    public async Task Start_FromValidStatus_TransitionsToLive(string initialStatus)
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: initialStatus);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Start(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto dto = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        dto.Status.Should().Be("live");
        dto.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Start_PublishesStatusEvent()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);

        await controller.Start(theater.Id);

        _rt.Verify(r => r.PublishAsync(
            $"theater:{theater.Id}", "theater:status", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("live")]
    [InlineData("paused")]
    [InlineData("ended")]
    public async Task Start_FromInvalidStatus_ReturnsConflict(string status)
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: status);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Start(theater.Id);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Start_AsNonHost_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<TheaterDto> result = await controller.Start(theater.Id);

        result.Result.Should().BeOfType<ForbidResult>();
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Pause_FromLive_TransitionsToPaused()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Pause(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto dto = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        dto.Status.Should().Be("paused");
    }

    [Theory]
    [InlineData("created")]
    [InlineData("paused")]
    [InlineData("ended")]
    public async Task Pause_FromNonLiveStatus_ReturnsConflict(string status)
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: status);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Pause(theater.Id);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    // ── Resume ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Resume_FromPaused_TransitionsToLive()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "paused");
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Resume(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto dto = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        dto.Status.Should().Be("live");
    }

    [Fact]
    public async Task Resume_FromLive_ReturnsConflict()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.Resume(theater.Id);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    // ── End ───────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("live")]
    [InlineData("paused")]
    public async Task End_FromValidStatus_TransitionsToEnded(string status)
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: status);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.End(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterDto dto = ok.Value.Should().BeOfType<TheaterDto>().Subject;
        dto.Status.Should().Be("ended");
        dto.EndedAt.Should().NotBeNull();
    }

    [Theory]
    [InlineData("created")]
    [InlineData("scheduled")]
    [InlineData("ended")]
    public async Task End_FromInvalidStatus_ReturnsConflict(string status)
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: status);
        TheatersController controller = MakeController(hostId);

        ActionResult<TheaterDto> result = await controller.End(theater.Id);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    // ── Join ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Join_NewParticipant_IncrementsViewerCount()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(viewerId);

        ActionResult<TheaterParticipantDto> result = await controller.Join(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        TheaterParticipantDto dto = ok.Value.Should().BeOfType<TheaterParticipantDto>().Subject;
        dto.Role.Should().Be("viewer");

        Theater? updated = await _db.Theaters.FindAsync(theater.Id);
        updated!.ViewerCount.Should().Be(1);
    }

    [Fact]
    public async Task Join_ExistingParticipant_RejoinsWithoutIncrementingCount()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id,
            UserId = viewerId,
            Role = "viewer",
            JoinedAt = DateTimeOffset.UtcNow.AddHours(-1),
            LeftAt = DateTimeOffset.UtcNow.AddMinutes(-30)
        });
        theater.ViewerCount = 1;
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(viewerId);

        await controller.Join(theater.Id);

        TheaterParticipant participant = await _db.TheaterParticipants
            .FirstAsync(p => p.TheaterId == theater.Id && p.UserId == viewerId);
        participant.LeftAt.Should().BeNull();

        Theater? updated = await _db.Theaters.FindAsync(theater.Id);
        updated!.ViewerCount.Should().Be(1, "re-join should not increment viewer count");
    }

    [Fact]
    public async Task Join_EndedTheater_ReturnsConflict()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "ended");
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<TheaterParticipantDto> result = await controller.Join(theater.Id);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Join_PublishesViewerEvents()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(Guid.NewGuid());

        await controller.Join(theater.Id);

        _rt.Verify(r => r.PublishAsync(
            $"theater:{theater.Id}", "theater:viewer_joined", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _rt.Verify(r => r.PublishAsync(
            $"theater:{theater.Id}", "theater:viewer_count", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── Leave ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Leave_ActiveParticipant_DecrementsViewerCount()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = viewerId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        theater.ViewerCount = 2;
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(viewerId);
        IActionResult result = await controller.Leave(theater.Id);

        result.Should().BeOfType<NoContentResult>();
        Theater? updated = await _db.Theaters.FindAsync(theater.Id);
        updated!.ViewerCount.Should().Be(1);
    }

    [Fact]
    public async Task Leave_NonParticipant_ReturnsNotFound()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(Guid.NewGuid());

        IActionResult result = await controller.Leave(theater.Id);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── MuteChat ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task MuteChat_AsHost_MutesTarget()
    {
        Guid hostId = Guid.NewGuid();
        Guid targetId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = targetId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(hostId);
        IActionResult result = await controller.MuteChat(theater.Id, targetId);

        result.Should().BeOfType<NoContentResult>();
        TheaterParticipant target = await _db.TheaterParticipants
            .FirstAsync(p => p.TheaterId == theater.Id && p.UserId == targetId);
        target.IsChatMuted.Should().BeTrue();
    }

    [Fact]
    public async Task MuteChat_AsViewer_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        Guid targetId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = viewerId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = targetId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(viewerId);
        IActionResult result = await controller.MuteChat(theater.Id, targetId);

        result.Should().BeOfType<ForbidResult>();
    }

    // ── Playback ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPlayback_ExistingState_ReturnsOk()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);

        ActionResult<PlaybackStateDto> result = await controller.GetPlayback(theater.Id);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PlaybackStateDto dto = ok.Value.Should().BeOfType<PlaybackStateDto>().Subject;
        dto.TheaterId.Should().Be(theater.Id);
        dto.IsPlaying.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePlayback_AsHost_UpdatesAndPublishes()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);
        UpdatePlaybackDto dto = new(PositionSeconds: 42.5f, IsPlaying: true);

        ActionResult<PlaybackStateDto> result = await controller.UpdatePlayback(theater.Id, dto);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PlaybackStateDto state = ok.Value.Should().BeOfType<PlaybackStateDto>().Subject;
        state.PositionSeconds.Should().Be(42.5f);
        state.IsPlaying.Should().BeTrue();

        _rt.Verify(r => r.PublishAsync(
            $"theater:{theater.Id}", "theater:playback_sync", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdatePlayback_AsNonHost_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<PlaybackStateDto> result = await controller.UpdatePlayback(
            theater.Id, new(10f, true));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    // ── SendChat ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SendChat_AsActiveParticipant_ReturnsMessageAndPublishes()
    {
        Guid hostId = Guid.NewGuid();
        Guid viewerId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = viewerId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(viewerId);

        ActionResult<ChatMessageDto> result = await controller.SendChat(
            theater.Id, new SendChatMessageDto("Hello world!"));

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ChatMessageDto msg = ok.Value.Should().BeOfType<ChatMessageDto>().Subject;
        msg.Content.Should().Be("Hello world!");
        msg.SenderId.Should().Be(viewerId);

        _rt.Verify(r => r.PublishAsync(
            $"theater:{theater.Id}", "theater:chat_message", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SendChat_WhenMuted_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Guid mutedUser = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = mutedUser, Role = "viewer",
            JoinedAt = DateTimeOffset.UtcNow, IsChatMuted = true
        });
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(mutedUser);

        ActionResult<ChatMessageDto> result = await controller.SendChat(
            theater.Id, new SendChatMessageDto("spam"));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task SendChat_NonParticipant_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheatersController controller = MakeController(Guid.NewGuid());

        ActionResult<ChatMessageDto> result = await controller.SendChat(
            theater.Id, new SendChatMessageDto("hello"));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    // ── DeleteChat ────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteChat_AsSender_SoftDeletesMessage()
    {
        Guid hostId = Guid.NewGuid();
        Guid senderId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = senderId, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        TheaterChatMessage msg = new TheaterChatMessage
        {
            Id = Guid.NewGuid(), TheaterId = theater.Id, SenderId = senderId,
            Content = "delete me", CreatedAt = DateTimeOffset.UtcNow
        };
        _db.TheaterChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(senderId);
        IActionResult result = await controller.DeleteChat(theater.Id, msg.Id);

        result.Should().BeOfType<NoContentResult>();
        TheaterChatMessage? deleted = await _db.TheaterChatMessages.FindAsync(msg.Id);
        deleted!.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteChat_AsHost_CanDeleteOtherUsersMessage()
    {
        Guid hostId = Guid.NewGuid();
        Guid senderId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        TheaterChatMessage msg = new TheaterChatMessage
        {
            Id = Guid.NewGuid(), TheaterId = theater.Id, SenderId = senderId,
            Content = "bad message", CreatedAt = DateTimeOffset.UtcNow
        };
        _db.TheaterChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(hostId);
        IActionResult result = await controller.DeleteChat(theater.Id, msg.Id);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteChat_AsOtherViewer_ReturnsForbid()
    {
        Guid hostId = Guid.NewGuid();
        Guid senderId = Guid.NewGuid();
        Guid otherViewer = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId, status: "live");
        _db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id, UserId = otherViewer, Role = "viewer", JoinedAt = DateTimeOffset.UtcNow
        });
        TheaterChatMessage msg = new TheaterChatMessage
        {
            Id = Guid.NewGuid(), TheaterId = theater.Id, SenderId = senderId,
            Content = "not yours", CreatedAt = DateTimeOffset.UtcNow
        };
        _db.TheaterChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        TheatersController controller = MakeController(otherViewer);
        IActionResult result = await controller.DeleteChat(theater.Id, msg.Id);

        result.Should().BeOfType<ForbidResult>();
    }

    // ── Invite ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Invite_PublishesToTargetUser()
    {
        Guid hostId = Guid.NewGuid();
        Guid inviteeId = Guid.NewGuid();
        Theater theater = await SeedTheater(hostId);
        TheatersController controller = MakeController(hostId);

        IActionResult result = await controller.Invite(theater.Id, new InviteDto(inviteeId));

        result.Should().BeOfType<NoContentResult>();
        _rt.Verify(r => r.PublishAsync(
            $"user:{inviteeId}", "theater:invite", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}