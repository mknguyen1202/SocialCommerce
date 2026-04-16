using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialContentService.Data;
using SocialContentService.Dtos;
using System.Security.Claims;

namespace SocialContentService.Controllers
{
    [ApiController]
    [Route("api/polls")]
    public class PollsController : ControllerBase
    {
        private readonly AppDb _db;
        public PollsController(AppDb db) { _db = db; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("uid")?.Value ?? User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        [HttpGet("{pollId}")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<PollReadDto>> Get(Guid pollId)
        {
            Poll? poll = await _db.Polls.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pollId);
            if (poll is null) return NotFound();
            List<PollOption> options = await _db.PollOptions.AsNoTracking()
                .Where(o => o.PollId == pollId)
                .OrderBy(o => o.DisplayOrder)
                .ToListAsync();
            return Ok(new PollReadDto(poll.Id, poll.PostId, poll.TotalVotes, poll.EndsAt,
                options.Select(o => new PollOptionReadDto(o.Id, o.Label, o.Votes, o.DisplayOrder))));
        }

        [HttpPost("{pollId}/vote")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Vote(Guid pollId, [FromBody] CastPollVoteDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();

            Poll? poll = await _db.Polls.FirstOrDefaultAsync(p => p.Id == pollId);
            if (poll is null) return NotFound();
            if (poll.EndsAt.HasValue && poll.EndsAt < DateTimeOffset.UtcNow)
                return BadRequest("Poll has ended.");

            PollOption? option = await _db.PollOptions.FirstOrDefaultAsync(o => o.Id == dto.OptionId && o.PollId == pollId);
            if (option is null) return BadRequest("Option does not belong to this poll.");

            PollVote? existing = await _db.PollVotes.FindAsync(pollId, userId.Value);
            if (existing != null)
            {
                // Change vote: decrement old option
                PollOption? oldOption = await _db.PollOptions.FindAsync(existing.OptionId);
                if (oldOption != null) oldOption.Votes = Math.Max(0, oldOption.Votes - 1);
                existing.OptionId = dto.OptionId;
            }
            else
            {
                _db.PollVotes.Add(new PollVote { PollId = pollId, UserId = userId.Value, OptionId = dto.OptionId });
                poll.TotalVotes++;
            }
            option.Votes++;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
