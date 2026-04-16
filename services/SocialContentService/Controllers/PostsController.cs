using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialContentService.Data;
using SocialContentService.Dtos;
using SocialContentService.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace SocialContentService.Controllers
{
    [ApiController]
    [Route("api/posts")]
    public class PostsController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus;
        public PostsController(AppDb db, IBusPublisher bus) { _db = db; _bus = bus; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("uid")?.Value ?? User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        [HttpGet]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> List([FromQuery] Guid? authorId, [FromQuery] Guid? groupId, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = Cursor.Decode(cursor) ?? DateTimeOffset.MaxValue;
            IQueryable<Post> q = _db.Posts.AsNoTracking().Where(p => p.CreatedAt < since && p.DeletedAt == null);
            if (authorId.HasValue) q = q.Where(p => p.AuthorUserId == authorId);
            if (groupId.HasValue) q = q.Where(p => p.GroupId == groupId);
            q = q.OrderByDescending(p => p.CreatedAt).Take(take + 1);
            List<Post> rows = await q.ToListAsync();
            string? next = rows.Count > take ? Cursor.Encode(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(p => p.ToRead()), nextCursor = next });
        }

        [HttpPost]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<PostReadDto>> Create([FromBody] CreatePostDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();

            // Posts in restricted/private groups start as pending review
            bool pending = false;
            if (dto.GroupId.HasValue)
            {
                Group? group = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(g => g.Id == dto.GroupId.Value);
                if (group != null && group.Visibility != "public")
                    pending = true;
            }

            Post post = new Post
            {
                Id = Guid.NewGuid(),
                AuthorUserId = userId.Value,
                GroupId = dto.GroupId,
                Type = dto.Type,
                Title = dto.Title,
                Body = dto.Body ?? dto.Text,
                Text = dto.Text,
                Media = dto.Media,
                LinkUrl = dto.LinkUrl,
                ProductRef = dto.ProductRef,
                Visibility = dto.Visibility,
                PendingReview = pending,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.Posts.Add(post);

            if (dto.MediaIds?.Any() == true)
            {
                int order = 0;
                foreach (Guid mid in dto.MediaIds)
                    _db.PostMedia.Add(new PostMedia { PostId = post.Id, MediaId = mid, DisplayOrder = order++ });
            }

            await _db.SaveChangesAsync();
            await _bus.PublishAsync("post.created", new { postId = post.Id, authorUserId = post.AuthorUserId, groupId = post.GroupId, createdAt = post.CreatedAt });
            return CreatedAtAction(nameof(Get), new { postId = post.Id }, post.ToRead());
        }

        [HttpGet("{postId}")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<PostReadDto>> Get(Guid postId)
        {
            Post? p = await _db.Posts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == postId && x.DeletedAt == null);
            return p is null ? NotFound() : Ok(p.ToRead());
        }

        [HttpPatch("{postId}")]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<PostReadDto>> Update(Guid postId, [FromBody] UpdatePostDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Post? p = await _db.Posts.FirstOrDefaultAsync(x => x.Id == postId && x.DeletedAt == null);
            if (p is null) return NotFound();
            if (p.AuthorUserId != userId) return Forbid();

            if (dto.Title != null) p.Title = dto.Title;
            if (dto.Body != null) { p.Body = dto.Body; p.Text = dto.Body; }
            if (dto.LinkUrl != null) p.LinkUrl = dto.LinkUrl;
            if (dto.Visibility.HasValue) p.Visibility = dto.Visibility.Value;
            p.EditedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(p.ToRead());
        }

        [HttpDelete("{postId}")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Delete(Guid postId)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Post? p = await _db.Posts.FirstOrDefaultAsync(x => x.Id == postId);
            if (p is null) return NotFound();
            if (p.AuthorUserId != userId) return Forbid();
            p.DeletedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{postId}/vote")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Vote(Guid postId, [FromBody] VoteDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            if (!await _db.Posts.AnyAsync(p => p.Id == postId && p.DeletedAt == null)) return NotFound();

            PostVote? existing = await _db.PostVotes.FindAsync(postId, userId.Value);
            if (dto.Value == 0)
            {
                if (existing != null) { _db.PostVotes.Remove(existing); await _db.SaveChangesAsync(); }
                return NoContent();
            }
            if (existing is null)
                _db.PostVotes.Add(new PostVote { PostId = postId, UserId = userId.Value, Value = dto.Value });
            else
                existing.Value = dto.Value;
            await _db.SaveChangesAsync();
            await RefreshPostVoteCountsAsync(postId);
            return NoContent();
        }

        [HttpPost("{postId}/save")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> ToggleSave(Guid postId)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            if (!await _db.Posts.AnyAsync(p => p.Id == postId && p.DeletedAt == null)) return NotFound();

            PostSave? existing = await _db.PostSaves.FindAsync(postId, userId.Value);
            if (existing is null)
                _db.PostSaves.Add(new PostSave { PostId = postId, UserId = userId.Value });
            else
                _db.PostSaves.Remove(existing);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private async Task RefreshPostVoteCountsAsync(Guid postId)
        {
            int up = await _db.PostVotes.CountAsync(v => v.PostId == postId && v.Value > 0);
            int down = await _db.PostVotes.CountAsync(v => v.PostId == postId && v.Value < 0);
            Post? post = await _db.Posts.FindAsync(postId);
            if (post != null) { post.Upvotes = up; post.Downvotes = down; await _db.SaveChangesAsync(); }
        }
    }
}