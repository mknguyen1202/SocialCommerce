using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialGraphService.Data;
using SocialGraphService.Dtos;
using SocialGraphService.Services;

namespace SocialGraphService.Controllers
{
    [ApiController]
    [Route("api/graph")]
    public class GraphController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus; private readonly ILogger<GraphController> _log;
        public GraphController(AppDb db, IBusPublisher bus, ILogger<GraphController> log) { _db = db; _bus = bus; _log = log; }

        // --- Follow / Unfollow ---
        [HttpPost("follow/{userId}")] // me → userId
        public async Task<IActionResult> Follow(Guid userId, [FromQuery] Guid me, CancellationToken ct)
        {
            // policy: cannot follow if blocked
            bool blocked = await _db.Blocks.AnyAsync(b => (b.BlockerUserId == me && b.BlockedUserId == userId) || (b.BlockerUserId == userId && b.BlockedUserId == me), ct);
            if (blocked) return Forbid();

            Follow row = new Follow { FollowerUserId = me, FolloweeUserId = userId, CreatedAt = DateTimeOffset.UtcNow };
            _db.Follows.Attach(row);
            _db.Entry(row).State = EntityState.Added; // idempotent on PK
            try { await _db.SaveChangesAsync(ct); await _bus.PublishAsync("user.followed", new { followerId = me, followeeId = userId, createdAt = row.CreatedAt }, ct); }
            catch (DbUpdateException) { /* already exists */ }
            return NoContent();
        }

        [HttpDelete("follow/{userId}")] // me → userId
        public async Task<IActionResult> Unfollow(Guid userId, [FromQuery] Guid me, CancellationToken ct)
        {
            Follow? row = await _db.Follows.FindAsync([me, userId], ct);
            if (row != null) { _db.Follows.Remove(row); await _db.SaveChangesAsync(ct); await _bus.PublishAsync("user.unfollowed", new { followerId = me, followeeId = userId, createdAt = DateTimeOffset.UtcNow }, ct); }
            return NoContent();
        }

        // --- Block / Unblock ---
        [HttpPost("block/{userId}")] // me blocks userId
        public async Task<IActionResult> Block(Guid userId, [FromQuery] Guid me, CancellationToken ct)
        {
            Block row = new Block { BlockerUserId = me, BlockedUserId = userId, CreatedAt = DateTimeOffset.UtcNow };
            _db.Blocks.Attach(row);
            _db.Entry(row).State = EntityState.Added;
            try
            {
                await _db.SaveChangesAsync(ct);
                await _bus.PublishAsync("user.blocked", new { blockerId = me, blockedId = userId, createdAt = row.CreatedAt }, ct);
            }
            catch (DbUpdateException) { }

            // optional: remove follow relations both ways
            Follow? ab = await _db.Follows.FindAsync([me, userId], ct);
            if (ab != null) _db.Follows.Remove(ab);
            Follow? ba = await _db.Follows.FindAsync([userId, me], ct);
            if (ba != null) _db.Follows.Remove(ba);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpDelete("block/{userId}")] // me unblocks userId
        public async Task<IActionResult> Unblock(Guid userId, [FromQuery] Guid me, CancellationToken ct)
        {
            Block? row = await _db.Blocks.FindAsync([me, userId], ct);
            if (row != null) { _db.Blocks.Remove(row); await _db.SaveChangesAsync(ct); await _bus.PublishAsync("user.unblocked", new { blockerId = me, blockedId = userId, createdAt = DateTimeOffset.UtcNow }, ct); }
            return NoContent();
        }

        // --- Lists (cursor = base64 milliseconds) ---
        [HttpGet("{userId}/following")]
        public async Task<ActionResult<PagedIds>> Following(Guid userId, [FromQuery] string? cursor, [FromQuery] int take = 50, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 1000);
            DateTimeOffset? before = Decode(cursor) ?? DateTimeOffset.MaxValue;
            IQueryable<Follow> q = _db.Follows.AsNoTracking().Where(f => f.FollowerUserId == userId && f.CreatedAt < before).OrderByDescending(f => f.CreatedAt).Take(take + 1);
            List<Follow> rows = await q.ToListAsync(ct);
            string? next = rows.Count > take ? Encode(rows.Last().CreatedAt) : null;
            return Ok(new PagedIds(rows.Take(take).Select(f => f.FolloweeUserId), next));
        }

        [HttpGet("{userId}/followers")]
        public async Task<ActionResult<PagedIds>> Followers(Guid userId, [FromQuery] string? cursor, [FromQuery] int take = 50, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 1000);
            DateTimeOffset? before = Decode(cursor) ?? DateTimeOffset.MaxValue;
            IQueryable<Follow> q = _db.Follows.AsNoTracking().Where(f => f.FolloweeUserId == userId && f.CreatedAt < before).OrderByDescending(f => f.CreatedAt).Take(take + 1);
            List<Follow> rows = await q.ToListAsync(ct);
            string? next = rows.Count > take ? Encode(rows.Last().CreatedAt) : null;
            return Ok(new PagedIds(rows.Take(take).Select(f => f.FollowerUserId), next));
        }

        [HttpGet("{userId}/blocks")]
        public async Task<ActionResult<object>> Blocks(Guid userId, [FromQuery] string direction = "out", CancellationToken ct = default)
        {
            if (string.Equals(direction, "both", StringComparison.OrdinalIgnoreCase))
            {
                List<Guid> blocks = await _db.Blocks.AsNoTracking().Where(b => b.BlockerUserId == userId).Select(b => b.BlockedUserId).ToListAsync(ct);
                List<Guid> blockedBy = await _db.Blocks.AsNoTracking().Where(b => b.BlockedUserId == userId).Select(b => b.BlockerUserId).ToListAsync(ct);
                return Ok(new { blocks, blockedBy });
            }
            else if (string.Equals(direction, "in", StringComparison.OrdinalIgnoreCase))
            {
                List<Guid> blockedBy = await _db.Blocks.AsNoTracking().Where(b => b.BlockedUserId == userId).Select(b => b.BlockerUserId).ToListAsync(ct);
                return Ok(new { blockedBy });
            }
            else
            {
                List<Guid> blocks = await _db.Blocks.AsNoTracking().Where(b => b.BlockerUserId == userId).Select(b => b.BlockedUserId).ToListAsync(ct);
                return Ok(new { blocks });
            }
        }

        // --- Relationship check ---
        [HttpGet("rel/{me}/{other}")]
        public async Task<ActionResult<RelCheck>> Rel(Guid me, Guid other, CancellationToken ct)
        {
            bool follow = await _db.Follows.AsNoTracking().AnyAsync(f => f.FollowerUserId == me && f.FolloweeUserId == other, ct);
            bool blockedByMe = await _db.Blocks.AsNoTracking().AnyAsync(b => b.BlockerUserId == me && b.BlockedUserId == other, ct);
            bool hasBlockedMe = await _db.Blocks.AsNoTracking().AnyAsync(b => b.BlockerUserId == other && b.BlockedUserId == me, ct);
            return Ok(new RelCheck(me, other, follow, blockedByMe, hasBlockedMe));
        }

        private static string Encode(DateTimeOffset t) => Convert.ToBase64String(BitConverter.GetBytes(t.ToUnixTimeMilliseconds()));
        private static DateTimeOffset? Decode(string? c)
        {
            if (string.IsNullOrWhiteSpace(c)) return null;
            try { long ms = BitConverter.ToInt64(Convert.FromBase64String(c)); return DateTimeOffset.FromUnixTimeMilliseconds(ms); }
            catch { return null; }
        }

        // --- Mutual follows (friends) ---
        [HttpGet("friends")]
        public async Task<ActionResult<PagedIds>> Friends([FromQuery] Guid me, [FromQuery] string? cursor, [FromQuery] int take = 50, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 1000);
            DateTimeOffset? before = Decode(cursor) ?? DateTimeOffset.MaxValue;
            // Mutual follow = I follow them AND they follow me
            HashSet<Guid> followingIds = await _db.Follows.AsNoTracking()
                .Where(f => f.FollowerUserId == me)
                .Select(f => f.FolloweeUserId)
                .ToHashSetAsync(ct);

            List<Follow> rows = await _db.Follows.AsNoTracking()
                .Where(f => f.FolloweeUserId == me && followingIds.Contains(f.FollowerUserId) && f.CreatedAt < before)
                .OrderByDescending(f => f.CreatedAt)
                .Take(take + 1)
                .ToListAsync(ct);

            string? next = rows.Count > take ? Encode(rows.Last().CreatedAt) : null;
            return Ok(new PagedIds(rows.Take(take).Select(f => f.FollowerUserId), next));
        }

        // --- Friend Requests ---
        [HttpGet("friend-requests")]
        public async Task<ActionResult<IEnumerable<FriendRequestRead>>> IncomingFriendRequests([FromQuery] Guid me, CancellationToken ct)
        {
            List<FriendRequest> rows = await _db.FriendRequests.AsNoTracking()
                .Where(r => r.ReceiverId == me && r.Status == "pending")
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(ct);
            return Ok(rows.Select(ToRead));
        }

        [HttpPost("friend-requests/{userId}")]
        public async Task<ActionResult<FriendRequestRead>> SendFriendRequest(Guid userId, [FromQuery] Guid me, CancellationToken ct)
        {
            if (me == userId) return BadRequest("Cannot send a friend request to yourself.");

            bool blocked = await _db.Blocks.AnyAsync(b =>
                (b.BlockerUserId == me && b.BlockedUserId == userId) ||
                (b.BlockerUserId == userId && b.BlockedUserId == me), ct);
            if (blocked) return Forbid();

            FriendRequest? existing = await _db.FriendRequests
                .FirstOrDefaultAsync(r => r.SenderId == me && r.ReceiverId == userId, ct);
            if (existing != null)
                return Conflict(new { message = "Friend request already exists.", status = existing.Status });

            FriendRequest req = new FriendRequest { SenderId = me, ReceiverId = userId };
            _db.FriendRequests.Add(req);
            await _db.SaveChangesAsync(ct);
            await _bus.PublishAsync("friend.request.sent", new { requestId = req.Id, senderId = me, receiverId = userId }, ct);
            return CreatedAtAction(nameof(IncomingFriendRequests), ToRead(req));
        }

        [HttpPost("friend-requests/{requestId}/accept")]
        public async Task<IActionResult> AcceptFriendRequest(Guid requestId, [FromQuery] Guid me, CancellationToken ct)
        {
            FriendRequest? req = await _db.FriendRequests.FindAsync([requestId], ct);
            if (req == null || req.ReceiverId != me) return NotFound();
            if (req.Status != "pending") return Conflict(new { message = "Request is no longer pending." });

            req.Status = "accepted";
            req.UpdatedAt = DateTimeOffset.UtcNow;

            // Create mutual follow
            Follow f1 = new Follow { FollowerUserId = me, FolloweeUserId = req.SenderId };
            Follow f2 = new Follow { FollowerUserId = req.SenderId, FolloweeUserId = me };
            _db.Follows.Attach(f1); _db.Entry(f1).State = EntityState.Added;
            _db.Follows.Attach(f2); _db.Entry(f2).State = EntityState.Added;
            try { await _db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { /* mutual follows may already exist */ }

            await _bus.PublishAsync("friend.request.accepted", new { requestId, senderId = req.SenderId, receiverId = me }, ct);
            return NoContent();
        }

        [HttpPost("friend-requests/{requestId}/decline")]
        public async Task<IActionResult> DeclineFriendRequest(Guid requestId, [FromQuery] Guid me, CancellationToken ct)
        {
            FriendRequest? req = await _db.FriendRequests.FindAsync([requestId], ct);
            if (req == null || req.ReceiverId != me) return NotFound();
            if (req.Status != "pending") return Conflict(new { message = "Request is no longer pending." });

            req.Status = "declined";
            req.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // --- Internal bulk is-following ---
        [HttpPost("/api/internal/graph/is-following")]
        public async Task<ActionResult<BulkIsFollowingResult>> BulkIsFollowing([FromBody] BulkIsFollowingRequest dto, CancellationToken ct)
        {
            HashSet<Guid> followeeSet = dto.FolloweeIds.ToHashSet();
            HashSet<Guid> followed = await _db.Follows.AsNoTracking()
                .Where(f => f.FollowerUserId == dto.FollowerId && followeeSet.Contains(f.FolloweeUserId))
                .Select(f => f.FolloweeUserId)
                .ToHashSetAsync(ct);

            Dictionary<Guid, bool> results = followeeSet.ToDictionary(id => id, id => followed.Contains(id));
            return Ok(new BulkIsFollowingResult(dto.FollowerId, results));
        }

        private static FriendRequestRead ToRead(FriendRequest r) =>
            new(r.Id, r.SenderId, r.ReceiverId, r.Status, r.CreatedAt, r.UpdatedAt);
    }
}