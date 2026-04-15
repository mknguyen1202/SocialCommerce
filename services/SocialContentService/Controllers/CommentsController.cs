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
    [Route("api/social/posts/{postId:guid}/comments")]
    public class CommentsController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus;
        public CommentsController(AppDb db, IBusPublisher bus) { _db = db; _bus = bus; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        [HttpGet]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> List(Guid postId, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = Cursor.Decode(cursor) ?? DateTimeOffset.MaxValue;
            List<Comment> rows = await _db.Comments.AsNoTracking()
                .Where(c => c.PostId == postId && c.ParentId == null && c.CreatedAt < since && c.DeletedAt == null)
                .OrderByDescending(c => c.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? Cursor.Encode(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(c => c.ToRead()), nextCursor = next });
        }

        [HttpPost]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<CommentReadDto>> Create(Guid postId, [FromBody] CreateCommentDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();

            bool exists = await _db.Posts.AnyAsync(p => p.Id == postId && p.DeletedAt == null);
            if (!exists) return NotFound();

            short depth = 0;
            if (dto.ParentId.HasValue)
            {
                Comment? parent = await _db.Comments.AsNoTracking().FirstOrDefaultAsync(c => c.Id == dto.ParentId.Value && c.DeletedAt == null);
                if (parent is null) return BadRequest("Parent comment not found.");
                if (parent.PostId != postId) return BadRequest("Parent comment does not belong to this post.");
                depth = (short)Math.Min(parent.Depth + 1, 10);
            }

            Comment c = new Comment
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                ParentId = dto.ParentId,
                AuthorUserId = userId.Value,
                Text = dto.Text,
                Depth = depth,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.Comments.Add(c);

            // Increment parent reply count or post comment count
            if (dto.ParentId.HasValue)
            {
                await _db.Comments
                    .Where(x => x.Id == dto.ParentId.Value)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReplyCount, x => x.ReplyCount + 1));
            }
            else
            {
                await _db.Posts
                    .Where(x => x.Id == postId)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.CommentCount, x => x.CommentCount + 1));
            }

            await _db.SaveChangesAsync();
            await _bus.PublishAsync("comment.created", new { postId, commentId = c.Id, authorUserId = c.AuthorUserId, parentId = c.ParentId, createdAt = c.CreatedAt });
            return CreatedAtAction(nameof(List), new { postId }, c.ToRead());
        }
    }
}