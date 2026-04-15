using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SocialGraphService.Controllers;
using SocialGraphService.Data;
using SocialGraphService.Dtos;
using SocialGraphService.Services;
using Xunit;

namespace SocialGraphService.Tests.Unit;

public class GraphControllerTests : IDisposable
{
    private readonly AppDb _db;
    private readonly Mock<IBusPublisher> _bus;
    private readonly GraphController _sut;

    public GraphControllerTests()
    {
        DbContextOptions<AppDb> options = new DbContextOptionsBuilder<AppDb>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDb(options);
        _bus = new Mock<IBusPublisher>();
        _sut = new GraphController(_db, _bus.Object, NullLogger<GraphController>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // ── Seed helpers ────────────────────────────────────────────────────────────

    private async Task SeedFollow(Guid follower, Guid followee, DateTimeOffset? createdAt = null)
    {
        _db.Follows.Add(new Follow
        {
            FollowerUserId = follower,
            FolloweeUserId = followee,
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
    }

    private async Task SeedBlock(Guid blocker, Guid blocked)
    {
        _db.Blocks.Add(new Block { BlockerUserId = blocker, BlockedUserId = blocked });
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
    }

    private async Task<FriendRequest> SeedFriendRequest(Guid sender, Guid receiver, string status = "pending")
    {
        FriendRequest req = new FriendRequest { SenderId = sender, ReceiverId = receiver, Status = status };
        _db.FriendRequests.Add(req);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        return req;
    }

    // ── Follow ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Follow_NoBlock_ReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        IActionResult result = await _sut.Follow(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Follow_NoBlock_PersistsFollowRow()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        await _sut.Follow(userId, me, CancellationToken.None);

        bool exists = await _db.Follows.AnyAsync(f => f.FollowerUserId == me && f.FolloweeUserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Follow_NoBlock_PublishesUserFollowedEvent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        await _sut.Follow(userId, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("user.followed", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Follow_BlockedByMe_ReturnsForbid()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedBlock(me, userId);

        IActionResult result = await _sut.Follow(userId, me, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Follow_BlockedByOther_ReturnsForbid()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedBlock(userId, me);

        IActionResult result = await _sut.Follow(userId, me, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    // ── Unfollow

    [Fact]
    public async Task Unfollow_FollowExists_RemovesRowAndReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedFollow(me, userId);

        IActionResult result = await _sut.Unfollow(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        bool exists = await _db.Follows.AnyAsync(f => f.FollowerUserId == me && f.FolloweeUserId == userId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Unfollow_FollowExists_PublishesUserUnfollowedEvent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedFollow(me, userId);

        await _sut.Unfollow(userId, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("user.unfollowed", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Unfollow_FollowDoesNotExist_ReturnsNoContentWithoutPublishing()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        IActionResult result = await _sut.Unfollow(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        _bus.Verify(b => b.PublishAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Block ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Block_NoExistingBlock_ReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        IActionResult result = await _sut.Block(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Block_NoExistingBlock_PersistsBlockRow()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        await _sut.Block(userId, me, CancellationToken.None);

        bool exists = await _db.Blocks.AnyAsync(b => b.BlockerUserId == me && b.BlockedUserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Block_NoExistingBlock_PublishesUserBlockedEvent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        await _sut.Block(userId, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("user.blocked", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Block_ExistingFollowsBothWays_RemovesBothFollows()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedFollow(me, userId);
        await SeedFollow(userId, me);

        await _sut.Block(userId, me, CancellationToken.None);

        bool meFollowsOther = await _db.Follows.AnyAsync(f => f.FollowerUserId == me && f.FolloweeUserId == userId);
        bool otherFollowsMe = await _db.Follows.AnyAsync(f => f.FollowerUserId == userId && f.FolloweeUserId == me);
        meFollowsOther.Should().BeFalse();
        otherFollowsMe.Should().BeFalse();
    }

    // ── Unblock ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Unblock_BlockExists_RemovesRowAndReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedBlock(me, userId);

        IActionResult result = await _sut.Unblock(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        bool exists = await _db.Blocks.AnyAsync(b => b.BlockerUserId == me && b.BlockedUserId == userId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Unblock_BlockExists_PublishesUserUnblockedEvent()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await SeedBlock(me, userId);

        await _sut.Unblock(userId, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("user.unblocked", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Unblock_BlockDoesNotExist_ReturnsNoContentWithoutPublishing()
    {
        Guid me = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        IActionResult result = await _sut.Unblock(userId, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        _bus.Verify(b => b.PublishAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Following ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Following_NoFollows_ReturnsEmptyPage()
    {
        Guid userId = Guid.NewGuid();

        ActionResult<PagedIds> result = await _sut.Following(userId, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().BeEmpty();
        page.NextCursor.Should().BeNull();
    }

    [Fact]
    public async Task Following_HasFollows_ReturnsFolloweeIds()
    {
        Guid userId = Guid.NewGuid();
        Guid followee1 = Guid.NewGuid();
        Guid followee2 = Guid.NewGuid();
        await SeedFollow(userId, followee1);
        await SeedFollow(userId, followee2);

        ActionResult<PagedIds> result = await _sut.Following(userId, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().Contain(followee1).And.Contain(followee2);
    }

    [Fact]
    public async Task Following_MoreItemsThanTake_SetsNextCursorAndTruncatesPage()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset baseTime = DateTimeOffset.UtcNow;
        for (int i = 0; i < 3; i++)
        {
            await SeedFollow(userId, Guid.NewGuid(), baseTime.AddMinutes(-(i + 1)));
        }

        ActionResult<PagedIds> result = await _sut.Following(userId, null, 2, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().HaveCount(2);
        page.NextCursor.Should().NotBeNull();
    }

    [Fact]
    public async Task Following_UseCursor_ReturnsNextPage()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset baseTime = DateTimeOffset.UtcNow;
        Guid followee1 = Guid.NewGuid();
        Guid followee2 = Guid.NewGuid();
        Guid followee3 = Guid.NewGuid();
        Guid followee4 = Guid.NewGuid();
        await SeedFollow(userId, followee1, baseTime.AddMinutes(-1));
        await SeedFollow(userId, followee2, baseTime.AddMinutes(-2));
        await SeedFollow(userId, followee3, baseTime.AddMinutes(-3));
        await SeedFollow(userId, followee4, baseTime.AddMinutes(-4));

        // First page (take=2): returns followee1, followee2; cursor points to -3min
        ActionResult<PagedIds> firstResult = await _sut.Following(userId, null, 2, CancellationToken.None);
        string? cursor = ((firstResult.Result as OkObjectResult)!.Value as PagedIds)!.NextCursor;

        // Second page: f.CreatedAt < -3min matches only followee4 (-4min)
        ActionResult<PagedIds> secondResult = await _sut.Following(userId, cursor, 2, CancellationToken.None);

        OkObjectResult ok = secondResult.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().ContainSingle();
        page.NextCursor.Should().BeNull();
    }

    // ── Followers ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Followers_HasFollowers_ReturnsFollowerIds()
    {
        Guid userId = Guid.NewGuid();
        Guid follower1 = Guid.NewGuid();
        Guid follower2 = Guid.NewGuid();
        await SeedFollow(follower1, userId);
        await SeedFollow(follower2, userId);

        ActionResult<PagedIds> result = await _sut.Followers(userId, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().Contain(follower1).And.Contain(follower2);
    }

    [Fact]
    public async Task Followers_DoesNotReturnFollowees()
    {
        Guid userId = Guid.NewGuid();
        Guid followee = Guid.NewGuid();
        await SeedFollow(userId, followee);

        ActionResult<PagedIds> result = await _sut.Followers(userId, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().BeEmpty();
    }

    // ── Blocks ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Blocks_DirectionOut_ReturnsOutboundBlocks()
    {
        Guid userId = Guid.NewGuid();
        Guid blockedId = Guid.NewGuid();
        await SeedBlock(userId, blockedId);

        ActionResult<object> result = await _sut.Blocks(userId, "out", CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(new { blocks = new[] { blockedId } });
    }

    [Fact]
    public async Task Blocks_DirectionIn_ReturnsInboundBlockedBy()
    {
        Guid userId = Guid.NewGuid();
        Guid blockerId = Guid.NewGuid();
        await SeedBlock(blockerId, userId);

        ActionResult<object> result = await _sut.Blocks(userId, "in", CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(new { blockedBy = new[] { blockerId } });
    }

    [Fact]
    public async Task Blocks_DirectionBoth_ReturnsBothDirections()
    {
        Guid userId = Guid.NewGuid();
        Guid blockedId = Guid.NewGuid();
        Guid blockerId = Guid.NewGuid();
        await SeedBlock(userId, blockedId);
        await SeedBlock(blockerId, userId);

        ActionResult<object> result = await _sut.Blocks(userId, "both", CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(new { blocks = new[] { blockedId }, blockedBy = new[] { blockerId } });
    }

    // ── Rel ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Rel_NoRelationship_AllFlagsFalse()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();

        ActionResult<RelCheck> result = await _sut.Rel(me, other, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        RelCheck rel = ok.Value.Should().BeOfType<RelCheck>().Subject;
        rel.IsFollowing.Should().BeFalse();
        rel.IsBlockedByMe.Should().BeFalse();
        rel.HasBlockedMe.Should().BeFalse();
    }

    [Fact]
    public async Task Rel_IsFollowing_ReturnsTrueIsFollowing()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedFollow(me, other);

        ActionResult<RelCheck> result = await _sut.Rel(me, other, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        RelCheck rel = ok.Value.Should().BeOfType<RelCheck>().Subject;
        rel.IsFollowing.Should().BeTrue();
        rel.IsBlockedByMe.Should().BeFalse();
        rel.HasBlockedMe.Should().BeFalse();
    }

    [Fact]
    public async Task Rel_BlockedByMe_ReturnsTrueIsBlockedByMeOnly()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedBlock(me, other);

        ActionResult<RelCheck> result = await _sut.Rel(me, other, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        RelCheck rel = ok.Value.Should().BeOfType<RelCheck>().Subject;
        rel.IsBlockedByMe.Should().BeTrue();
        rel.HasBlockedMe.Should().BeFalse();
    }

    [Fact]
    public async Task Rel_BlockedByOther_ReturnsTrueHasBlockedMeOnly()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedBlock(other, me);

        ActionResult<RelCheck> result = await _sut.Rel(me, other, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        RelCheck rel = ok.Value.Should().BeOfType<RelCheck>().Subject;
        rel.HasBlockedMe.Should().BeTrue();
        rel.IsBlockedByMe.Should().BeFalse();
    }

    // ── Friends ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Friends_MutualFollow_ReturnsFriendId()
    {
        Guid me = Guid.NewGuid();
        Guid friend = Guid.NewGuid();
        await SeedFollow(me, friend);
        await SeedFollow(friend, me);

        ActionResult<PagedIds> result = await _sut.Friends(me, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().ContainSingle().Which.Should().Be(friend);
    }

    [Fact]
    public async Task Friends_OneWayFollow_ReturnsEmpty()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedFollow(me, other);

        ActionResult<PagedIds> result = await _sut.Friends(me, null, 50, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        PagedIds page = ok.Value.Should().BeOfType<PagedIds>().Subject;
        page.Items.Should().BeEmpty();
    }

    // ── IncomingFriendRequests ────────────────────────────────────────────────────

    [Fact]
    public async Task IncomingFriendRequests_PendingRequest_ReturnsRequest()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        ActionResult<IEnumerable<FriendRequestRead>> result = await _sut.IncomingFriendRequests(me, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        IEnumerable<FriendRequestRead> items = ok.Value.Should().BeAssignableTo<IEnumerable<FriendRequestRead>>().Subject;
        items.Should().ContainSingle(r => r.Id == req.Id && r.SenderId == sender && r.ReceiverId == me && r.Status == "pending");
    }

    [Fact]
    public async Task IncomingFriendRequests_AcceptedRequest_IsNotReturned()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        await SeedFriendRequest(sender, me, "accepted");

        ActionResult<IEnumerable<FriendRequestRead>> result = await _sut.IncomingFriendRequests(me, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        IEnumerable<FriendRequestRead> items = ok.Value.Should().BeAssignableTo<IEnumerable<FriendRequestRead>>().Subject;
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task IncomingFriendRequests_RequestSentByMe_IsNotReturned()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedFriendRequest(me, other);

        ActionResult<IEnumerable<FriendRequestRead>> result = await _sut.IncomingFriendRequests(me, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        IEnumerable<FriendRequestRead> items = ok.Value.Should().BeAssignableTo<IEnumerable<FriendRequestRead>>().Subject;
        items.Should().BeEmpty();
    }

    // ── SendFriendRequest ─────────────────────────────────────────────────────────

    [Fact]
    public async Task SendFriendRequest_ToSelf_ReturnsBadRequest()
    {
        Guid me = Guid.NewGuid();

        ActionResult<FriendRequestRead> result = await _sut.SendFriendRequest(me, me, CancellationToken.None);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SendFriendRequest_BlockedByMe_ReturnsForbid()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedBlock(me, other);

        ActionResult<FriendRequestRead> result = await _sut.SendFriendRequest(other, me, CancellationToken.None);

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task SendFriendRequest_BlockedByOther_ReturnsForbid()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedBlock(other, me);

        ActionResult<FriendRequestRead> result = await _sut.SendFriendRequest(other, me, CancellationToken.None);

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task SendFriendRequest_DuplicateRequest_ReturnsConflict()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();
        await SeedFriendRequest(me, other);

        ActionResult<FriendRequestRead> result = await _sut.SendFriendRequest(other, me, CancellationToken.None);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task SendFriendRequest_Valid_ReturnsCreatedWithMappedDto()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();

        ActionResult<FriendRequestRead> result = await _sut.SendFriendRequest(other, me, CancellationToken.None);

        CreatedAtActionResult created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        FriendRequestRead dto = created.Value.Should().BeOfType<FriendRequestRead>().Subject;
        dto.SenderId.Should().Be(me);
        dto.ReceiverId.Should().Be(other);
        dto.Status.Should().Be("pending");
    }

    [Fact]
    public async Task SendFriendRequest_Valid_PublishesFriendRequestSentEvent()
    {
        Guid me = Guid.NewGuid();
        Guid other = Guid.NewGuid();

        await _sut.SendFriendRequest(other, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("friend.request.sent", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── AcceptFriendRequest ───────────────────────────────────────────────────────

    [Fact]
    public async Task AcceptFriendRequest_ValidRequest_ReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        IActionResult result = await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task AcceptFriendRequest_ValidRequest_UpdatesStatusToAccepted()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        FriendRequest? updated = await _db.FriendRequests.FindAsync(req.Id);
        updated!.Status.Should().Be("accepted");
    }

    [Fact]
    public async Task AcceptFriendRequest_ValidRequest_CreatesMutualFollows()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        bool meFollowsSender = await _db.Follows.AnyAsync(f => f.FollowerUserId == me && f.FolloweeUserId == sender);
        bool senderFollowsMe = await _db.Follows.AnyAsync(f => f.FollowerUserId == sender && f.FolloweeUserId == me);
        meFollowsSender.Should().BeTrue();
        senderFollowsMe.Should().BeTrue();
    }

    [Fact]
    public async Task AcceptFriendRequest_ValidRequest_PublishesFriendRequestAcceptedEvent()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        _bus.Verify(b => b.PublishAsync("friend.request.accepted", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AcceptFriendRequest_NotTheReceiver_ReturnsNotFound()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        Guid otherUser = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, otherUser);

        IActionResult result = await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task AcceptFriendRequest_AlreadyAccepted_ReturnsConflict()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me, "accepted");

        IActionResult result = await _sut.AcceptFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task AcceptFriendRequest_RequestNotFound_ReturnsNotFound()
    {
        Guid me = Guid.NewGuid();

        IActionResult result = await _sut.AcceptFriendRequest(Guid.NewGuid(), me, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── DeclineFriendRequest ──────────────────────────────────────────────────────

    [Fact]
    public async Task DeclineFriendRequest_ValidRequest_ReturnsNoContent()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        IActionResult result = await _sut.DeclineFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeclineFriendRequest_ValidRequest_UpdatesStatusToDeclined()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me);

        await _sut.DeclineFriendRequest(req.Id, me, CancellationToken.None);

        FriendRequest? updated = await _db.FriendRequests.FindAsync(req.Id);
        updated!.Status.Should().Be("declined");
    }

    [Fact]
    public async Task DeclineFriendRequest_NotTheReceiver_ReturnsNotFound()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        Guid otherUser = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, otherUser);

        IActionResult result = await _sut.DeclineFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeclineFriendRequest_AlreadyDeclined_ReturnsConflict()
    {
        Guid me = Guid.NewGuid();
        Guid sender = Guid.NewGuid();
        FriendRequest req = await SeedFriendRequest(sender, me, "declined");

        IActionResult result = await _sut.DeclineFriendRequest(req.Id, me, CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task DeclineFriendRequest_RequestNotFound_ReturnsNotFound()
    {
        Guid me = Guid.NewGuid();

        IActionResult result = await _sut.DeclineFriendRequest(Guid.NewGuid(), me, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── BulkIsFollowing ───────────────────────────────────────────────────────────

    [Fact]
    public async Task BulkIsFollowing_SomeFollowed_ReturnsTrueForFollowedAndFalseForRest()
    {
        Guid me = Guid.NewGuid();
        Guid followedId = Guid.NewGuid();
        Guid notFollowedId = Guid.NewGuid();
        await SeedFollow(me, followedId);

        BulkIsFollowingRequest dto = new BulkIsFollowingRequest(me, new[] { followedId, notFollowedId });

        ActionResult<BulkIsFollowingResult> result = await _sut.BulkIsFollowing(dto, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        BulkIsFollowingResult bulk = ok.Value.Should().BeOfType<BulkIsFollowingResult>().Subject;
        bulk.FollowerId.Should().Be(me);
        bulk.Results[followedId].Should().BeTrue();
        bulk.Results[notFollowedId].Should().BeFalse();
    }

    [Fact]
    public async Task BulkIsFollowing_EmptyFolloweeList_ReturnsEmptyResults()
    {
        Guid me = Guid.NewGuid();
        BulkIsFollowingRequest dto = new BulkIsFollowingRequest(me, Array.Empty<Guid>());

        ActionResult<BulkIsFollowingResult> result = await _sut.BulkIsFollowing(dto, CancellationToken.None);

        OkObjectResult ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        BulkIsFollowingResult bulk = ok.Value.Should().BeOfType<BulkIsFollowingResult>().Subject;
        bulk.Results.Should().BeEmpty();
    }
}
