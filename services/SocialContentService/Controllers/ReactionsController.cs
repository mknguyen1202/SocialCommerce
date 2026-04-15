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
    [Route("api/social/posts/{postId:guid}/reactions")]
    public class ReactionsController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus;
        public ReactionsController(AppDb db, IBusPublisher bus) { _db = db; _bus = bus; }
        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }


        [HttpPost]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Add(Guid postId, [FromBody] ReactDto dto)
        {
            Guid? userId = CurrentUserId(); if (userId is null) return Unauthorized();
            bool exists = await _db.Posts.AnyAsync(p => p.Id == postId); if (!exists) return NotFound();
            Reaction? r = await _db.Reactions.FindAsync(postId, userId.Value);
            if (r is null)
            {
                _db.Reactions.Add(new Reaction { PostId = postId, UserId = userId.Value, Kind = dto.Kind, CreatedAt = DateTimeOffset.UtcNow });
                await _db.SaveChangesAsync();
                await _bus.PublishAsync("reaction.added", new { postId, userId = userId.Value, kind = dto.Kind });
            }
            else if (!string.Equals(r.Kind, dto.Kind, StringComparison.OrdinalIgnoreCase))
            {
                r.Kind = dto.Kind; await _db.SaveChangesAsync();
                await _bus.PublishAsync("reaction.changed", new { postId, userId = userId.Value, kind = dto.Kind });
            }
            return NoContent();
        }


        [HttpDelete]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Remove(Guid postId)
        {
            Guid? userId = CurrentUserId(); if (userId is null) return Unauthorized();
            Reaction? r = await _db.Reactions.FindAsync(postId, userId.Value);
            if (r is null) return NoContent();
            _db.Reactions.Remove(r); await _db.SaveChangesAsync();
            await _bus.PublishAsync("reaction.removed", new { postId, userId = userId.Value });
            return NoContent();
        }
    }
}