using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialContentService.Data;
using SocialContentService.Dtos;
using SocialContentService.Services;
using System.Security.Claims;

namespace SocialContentService.Controllers
{
    [ApiController]
    [Route("api/content/users")]
    public class UserPostsController : ControllerBase
    {
        private readonly AppDb _db;
        public UserPostsController(AppDb db) { _db = db; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        // GET /api/social/users/{userId}/posts — public wall for any user
        [HttpGet("{userId}/posts")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> UserPosts(Guid userId, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = Cursor.Decode(cursor) ?? DateTimeOffset.MaxValue;
            List<Post> rows = await _db.Posts.AsNoTracking()
                .Where(p => p.AuthorUserId == userId && p.GroupId == null && p.DeletedAt == null
                            && p.Visibility == Visibility.Public && p.CreatedAt < since)
                .OrderByDescending(p => p.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? Cursor.Encode(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(p => p.ToRead()), nextCursor = next });
        }

        // GET /api/social/users/{userId}/saved — saved posts (only accessible by the owning user)
        [HttpGet("{userId}/saved")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> UserSaved(Guid userId, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            Guid? me = CurrentUserId();
            if (me != userId) return Forbid();

            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = Cursor.Decode(cursor) ?? DateTimeOffset.MaxValue;

            List<Guid> postIds = await _db.PostSaves.AsNoTracking()
                .Where(s => s.UserId == userId)
                .Select(s => s.PostId)
                .ToListAsync();

            List<Post> rows = await _db.Posts.AsNoTracking()
                .Where(p => postIds.Contains(p.Id) && p.DeletedAt == null && p.CreatedAt < since)
                .OrderByDescending(p => p.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? Cursor.Encode(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(p => p.ToRead()), nextCursor = next });
        }
    }
}
