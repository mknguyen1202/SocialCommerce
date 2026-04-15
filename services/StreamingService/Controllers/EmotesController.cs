using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StreamingService.Data;
using StreamingService.Dtos;
using System.Security.Claims;

namespace StreamingService.Controllers;

[ApiController]
[Authorize]
public class EmotesController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // GET /emotes — global emotes
    [HttpGet("emotes")]
    public async Task<ActionResult<IEnumerable<EmoteDto>>> GetGlobal(CancellationToken ct = default)
    {
        List<EmoteDto> emotes = await db.Emotes
            .Where(e => e.Category == "global")
            .Select(e => new EmoteDto(e.Id, e.Code, e.ImageUrl, e.Category, e.TheaterId, e.CreatedBy))
            .ToListAsync(ct);
        return Ok(emotes);
    }

    // GET /theaters/{theaterId}/emotes — theater-scoped emotes
    [HttpGet("theaters/{theaterId:guid}/emotes")]
    public async Task<ActionResult<IEnumerable<EmoteDto>>> GetTheaterEmotes(
        Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        List<EmoteDto> emotes = await db.Emotes
            .Where(e => e.TheaterId == theaterId)
            .Select(e => new EmoteDto(e.Id, e.Code, e.ImageUrl, e.Category, e.TheaterId, e.CreatedBy))
            .ToListAsync(ct);
        return Ok(emotes);
    }

    // POST /theaters/{theaterId}/emotes — create theater emote (host only)
    [HttpPost("theaters/{theaterId:guid}/emotes")]
    public async Task<ActionResult<EmoteDto>> CreateTheaterEmote(
        Guid theaterId, [FromBody] CreateEmoteDto dto, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();

        Emote emote = new Emote
        {
            Code = dto.Code,
            ImageUrl = dto.ImageUrl,
            Category = "theater",
            TheaterId = theaterId,
            CreatedBy = UserId
        };
        db.Emotes.Add(emote);
        await db.SaveChangesAsync(ct);

        return Ok(new EmoteDto(emote.Id, emote.Code, emote.ImageUrl, emote.Category, emote.TheaterId, emote.CreatedBy));
    }
}
