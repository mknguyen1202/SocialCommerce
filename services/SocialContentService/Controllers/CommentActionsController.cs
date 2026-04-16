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
    [Route("api/comments")]
    public class CommentActionsController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus;
        public CommentActionsController(AppDb db, IBusPublisher bus) { _db = db; _bus = bus; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("uid")?.Value ?? User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        [HttpGet("{commentId}/replies")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> GetReplies(Guid commentId, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = Cursor.Decode(cursor) ?? DateTimeOffset.MaxValue;
            List<Comment> rows = await _db.Comments.AsNoTracking()
                .Where(c => c.ParentId == commentId && c.CreatedAt < since && c.DeletedAt == null)
                .OrderByDescending(c => c.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? Cursor.Encode(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(c => c.ToRead()), nextCursor = next });
        }

        [HttpPatch("{commentId}")]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<CommentReadDto>> Edit(Guid commentId, [FromBody] UpdateCommentDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Comment? c = await _db.Comments.FirstOrDefaultAsync(x => x.Id == commentId && x.DeletedAt == null);
            if (c is null) return NotFound();
            if (c.AuthorUserId != userId) return Forbid();
            c.Text = dto.Text;
            c.EditedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(c.ToRead());
        }

        [HttpDelete("{commentId}")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Delete(Guid commentId)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Comment? c = await _db.Comments.FirstOrDefaultAsync(x => x.Id == commentId);
            if (c is null) return NotFound();
            if (c.AuthorUserId != userId) return Forbid();
            c.DeletedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{commentId}/vote")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Vote(Guid commentId, [FromBody] VoteDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            if (!await _db.Comments.AnyAsync(c => c.Id == commentId && c.DeletedAt == null)) return NotFound();

            CommentVote? existing = await _db.CommentVotes.FindAsync(commentId, userId.Value);
            if (dto.Value == 0)
            {
                if (existing != null) { _db.CommentVotes.Remove(existing); await _db.SaveChangesAsync(); }
                return NoContent();
            }
            if (existing is null)
                _db.CommentVotes.Add(new CommentVote { CommentId = commentId, UserId = userId.Value, Value = dto.Value });
            else
                existing.Value = dto.Value;
            await _db.SaveChangesAsync();
            await RefreshCommentVoteCountsAsync(commentId);
            return NoContent();
        }

        private async Task RefreshCommentVoteCountsAsync(Guid commentId)
        {
            int up = await _db.CommentVotes.CountAsync(v => v.CommentId == commentId && v.Value > 0);
            int down = await _db.CommentVotes.CountAsync(v => v.CommentId == commentId && v.Value < 0);
            Comment? comment = await _db.Comments.FindAsync(commentId);
            if (comment != null) { comment.Upvotes = up; comment.Downvotes = down; await _db.SaveChangesAsync(); }
        }
    }
}
