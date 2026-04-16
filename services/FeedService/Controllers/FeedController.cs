using System.Security.Claims;
using FeedService.Data;
using FeedService.Dtos;
using FeedService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FeedService.Controllers
{
    [ApiController]
    [Route("api/feed")]
    public class FeedController : ControllerBase
    {
        private readonly AppDb _db;
        private readonly IFeedBuilder _builder;
        private readonly ICache _cache;
        private readonly IContentClient _content;
        private readonly ILogger<FeedController> _log;
        public FeedController(AppDb db, IFeedBuilder builder, ICache cache, IContentClient content, ILogger<FeedController> log)
        { _db = db; _builder = builder; _cache = cache; _content = content; _log = log; }

        private Guid? CurrentUserId()
        {
            string? val = HttpContext.User.FindFirst("uid")?.Value ?? HttpContext.User.FindFirst("oid")?.Value ?? HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? HttpContext.User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        [HttpGet("home")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<FeedPage>> Home([FromQuery] string? cursor, [FromQuery] int take = 20, CancellationToken ct = default)
        {
            Guid? me = CurrentUserId();
            if (me is null) return Unauthorized();

            take = Math.Clamp(take, 1, 100);
            DateTimeOffset before = Decode(cursor) ?? DateTimeOffset.MaxValue;

            // Try cache first (optional; using time-bucket as cursor key)
            string key = before == DateTimeOffset.MaxValue ? "now" : before.ToUnixTimeSeconds().ToString();
            List<Guid>? cached = await _cache.GetTimelineAsync(me.Value, key, take);
            List<Timeline> items;
            if (cached != null)
            {
                items = cached.Select(p => new Timeline { UserId = me.Value, PostId = p, Rank = 0, CreatedAt = before }).ToList();
            }
            else
            {
                items = await _builder.GetHomeAsync(me.Value, before, take + 1, ct);
                await _cache.SetTimelineAsync(me.Value, key, items.Select(i => i.PostId), TimeSpan.FromMinutes(2));
            }

            bool hasMore = items.Count > take;
            List<Timeline> page = items.Take(take).ToList();
            string? next = hasMore ? Encode(items[take].CreatedAt) : null;

            // Hydrate post IDs into full post objects
            List<HydratedPost> posts = await _content.GetPostsByIdsAsync(page.Select(i => i.PostId), ct);
            Dictionary<Guid, HydratedPost> lookup = posts.ToDictionary(p => p.Id);
            // Preserve timeline order; fall back to stub items when content service is unavailable
            List<object> ordered = page.Select(i =>
                lookup.TryGetValue(i.PostId, out HydratedPost? p)
                    ? (object)p
                    : new FeedItem(i.PostId, i.Rank, i.CreatedAt)).ToList();

            return Ok(new FeedPage(ordered, next, hasMore));
        }

        [HttpGet("user/{userId}")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<FeedPage>> UserFeed(Guid userId, [FromQuery] string? cursor, [FromQuery] int take = 20, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset before = Decode(cursor) ?? DateTimeOffset.MaxValue;
            List<Timeline> items = await _builder.GetUserAsync(userId, before, take + 1, ct);
            bool hasMore = items.Count > take;
            List<Timeline> page = items.Take(take).ToList();
            string? next = hasMore ? Encode(items[take].CreatedAt) : null;

            List<HydratedPost> posts = await _content.GetPostsByIdsAsync(page.Select(i => i.PostId), ct);
            Dictionary<Guid, HydratedPost> lookup = posts.ToDictionary(p => p.Id);
            List<object> ordered = page.Select(i =>
                lookup.TryGetValue(i.PostId, out HydratedPost? p)
                    ? (object)p
                    : new FeedItem(i.PostId, i.Rank, i.CreatedAt)).ToList();

            return Ok(new FeedPage(ordered, next, hasMore));
        }

        [HttpGet("explore")]
        public async Task<ActionResult<FeedPage>> Explore([FromQuery] string? cursor, [FromQuery] int take = 20, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset before = Decode(cursor) ?? DateTimeOffset.MaxValue;

            // Trending: most recently ranked posts across all users
            var rows = await _db.Timelines.AsNoTracking()
                .Where(t => t.CreatedAt < before)
                .OrderByDescending(t => t.Rank)
                .ThenByDescending(t => t.CreatedAt)
                .Select(t => new { t.PostId, t.Rank, t.CreatedAt })
                .Take(take + 1)
                .ToListAsync(ct);

            bool hasMore = rows.Count > take;
            var page = rows.Take(take).ToList();
            string? next = hasMore ? Encode(rows[take].CreatedAt) : null;

            List<HydratedPost> posts = await _content.GetPostsByIdsAsync(page.Select(r => r.PostId), ct);
            Dictionary<Guid, HydratedPost> lookup = posts.ToDictionary(p => p.Id);
            List<object> ordered = page.Select(r =>
                lookup.TryGetValue(r.PostId, out HydratedPost? p)
                    ? (object)p
                    : new FeedItem(r.PostId, r.Rank, r.CreatedAt)).ToList();

            return Ok(new FeedPage(ordered, next, hasMore));
        }

        [HttpGet("group/{slug}")]
        public async Task<ActionResult<FeedPage>> GroupFeed(string slug, [FromQuery] string? cursor, [FromQuery] int take = 20, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset before = Decode(cursor) ?? DateTimeOffset.MaxValue;
            List<FeedItem> items = await _content.GetGroupPostsAsync(slug, before, take + 1, ct);
            bool hasMore = items.Count > take;
            List<FeedItem> page = items.Take(take).ToList();
            string? next = hasMore ? Encode(items[take].CreatedAt) : null;

            List<HydratedPost> posts = await _content.GetPostsByIdsAsync(page.Select(i => i.PostId), ct);
            Dictionary<Guid, HydratedPost> lookup = posts.ToDictionary(p => p.Id);
            List<object> ordered = page.Select(i =>
                lookup.TryGetValue(i.PostId, out HydratedPost? p)
                    ? (object)p
                    : new FeedItem(i.PostId, 0, i.CreatedAt)).ToList();

            return Ok(new FeedPage(ordered, next, hasMore));
        }

        [HttpPost("mark-seen")]
        //[Authorize(Policy = "social.read")]
        public async Task<IActionResult> MarkSeen([FromBody] MarkSeenRequest dto, [FromQuery] Guid me)
        {
            Marker? m = await _db.Markers.FindAsync(me) ?? new Marker { UserId = me };
            m.LastSeenAt = dto.LastSeenAt;
            _db.Update(m);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private static string Encode(DateTimeOffset t) => Convert.ToBase64String(BitConverter.GetBytes(t.ToUnixTimeMilliseconds()));
        private static DateTimeOffset? Decode(string? c)
        {
            if (string.IsNullOrWhiteSpace(c)) return null;
            try { long ms = BitConverter.ToInt64(Convert.FromBase64String(c)); return DateTimeOffset.FromUnixTimeMilliseconds(ms); }
            catch { return null; }
        }
    }
}