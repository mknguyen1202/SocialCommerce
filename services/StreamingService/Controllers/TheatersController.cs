using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StreamingService.Data;
using StreamingService.Dtos;
using StreamingService.Services;
using System.Security.Claims;
using System.Text;

namespace StreamingService.Controllers;

[ApiController]
[Authorize]
[Route("theaters")]
public class TheatersController(AppDbContext db, IRealTimePublisher rt) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // ── CRUD ──────────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<ActionResult<TheaterDto>> Create(
        [FromBody] CreateTheaterDto dto, CancellationToken ct = default)
    {
        Theater theater = new Theater
        {
            HostId = UserId,
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Tags = dto.Tags ?? [],
            Visibility = dto.Visibility,
            SourceType = dto.SourceType,
            SourceUrl = dto.SourceUrl,
            SourceMediaId = dto.SourceMediaId,
            MaxViewers = dto.MaxViewers,
            ScheduledAt = dto.ScheduledAt,
            Status = dto.ScheduledAt.HasValue ? "scheduled" : "created",
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Theaters.Add(theater);

        db.TheaterParticipants.Add(new TheaterParticipant
        {
            TheaterId = theater.Id,
            UserId = UserId,
            Role = "host",
            JoinedAt = DateTimeOffset.UtcNow
        });

        db.PlaybackStates.Add(new PlaybackState
        {
            TheaterId = theater.Id,
            PositionSeconds = 0,
            IsPlaying = false,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { theaterId = theater.Id }, ToDto(theater));
    }

    [HttpGet("{theaterId:guid}")]
    public async Task<ActionResult<TheaterDto>> Get(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        return theater == null ? NotFound() : Ok(ToDto(theater));
    }

    [HttpPatch("{theaterId:guid}")]
    public async Task<ActionResult<TheaterDto>> Update(
        Guid theaterId, [FromBody] UpdateTheaterDto dto, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();

        if (dto.Title != null) theater.Title = dto.Title;
        if (dto.Description != null) theater.Description = dto.Description;
        if (dto.Tags != null) theater.Tags = dto.Tags;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(theater));
    }

    // ── Lifecycle state machine ───────────────────────────────────────────────

    [HttpPost("{theaterId:guid}/start")]
    public async Task<ActionResult<TheaterDto>> Start(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();
        if (theater.Status is not ("created" or "scheduled"))
            return Conflict(new { error = "Theater can only be started from 'created' or 'scheduled' status." });

        theater.Status = "live";
        theater.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:status",
            new { theaterId, status = theater.Status }, ct);

        return Ok(ToDto(theater));
    }

    [HttpPost("{theaterId:guid}/pause")]
    public async Task<ActionResult<TheaterDto>> Pause(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();
        if (theater.Status != "live")
            return Conflict(new { error = "Theater can only be paused from 'live' status." });

        theater.Status = "paused";
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:status",
            new { theaterId, status = theater.Status }, ct);

        return Ok(ToDto(theater));
    }

    [HttpPost("{theaterId:guid}/resume")]
    public async Task<ActionResult<TheaterDto>> Resume(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();
        if (theater.Status != "paused")
            return Conflict(new { error = "Theater can only be resumed from 'paused' status." });

        theater.Status = "live";
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:status",
            new { theaterId, status = theater.Status }, ct);

        return Ok(ToDto(theater));
    }

    [HttpPost("{theaterId:guid}/end")]
    public async Task<ActionResult<TheaterDto>> End(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();
        if (theater.Status is not ("live" or "paused"))
            return Conflict(new { error = "Theater can only be ended from 'live' or 'paused' status." });

        theater.Status = "ended";
        theater.EndedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:status",
            new { theaterId, status = theater.Status }, ct);

        return Ok(ToDto(theater));
    }

    // ── Participants ──────────────────────────────────────────────────────────

    [HttpPost("{theaterId:guid}/join")]
    public async Task<ActionResult<TheaterParticipantDto>> Join(
        Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.Status == "ended")
            return Conflict(new { error = "Theater has ended." });

        TheaterParticipant? existing = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == UserId, ct);

        if (existing != null)
        {
            existing.LeftAt = null;
            existing.JoinedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            existing = new TheaterParticipant
            {
                TheaterId = theaterId,
                UserId = UserId,
                Role = "viewer",
                JoinedAt = DateTimeOffset.UtcNow
            };
            db.TheaterParticipants.Add(existing);
            theater.ViewerCount++;
        }

        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:viewer_joined", ToParticipantDto(existing), ct);
        await rt.PublishAsync($"theater:{theaterId}", "theater:viewer_count", new { count = theater.ViewerCount }, ct);

        return Ok(ToParticipantDto(existing));
    }

    [HttpPost("{theaterId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid theaterId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        TheaterParticipant? participant = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == UserId, ct);
        if (participant == null) return NotFound();

        participant.LeftAt = DateTimeOffset.UtcNow;
        if (theater.ViewerCount > 0) theater.ViewerCount--;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:viewer_left", new { userId = UserId }, ct);
        await rt.PublishAsync($"theater:{theaterId}", "theater:viewer_count", new { count = theater.ViewerCount }, ct);

        return NoContent();
    }

    [HttpGet("{theaterId:guid}/participants")]
    public async Task<ActionResult<IEnumerable<TheaterParticipantDto>>> GetParticipants(
        Guid theaterId, CancellationToken ct = default)
    {
        List<TheaterParticipantDto> participants = await db.TheaterParticipants
            .Where(p => p.TheaterId == theaterId && p.LeftAt == null)
            .Select(p => new TheaterParticipantDto(p.TheaterId, p.UserId, p.Role, p.JoinedAt, p.LeftAt, p.IsChatMuted))
            .ToListAsync(ct);
        return Ok(participants);
    }

    [HttpPost("{theaterId:guid}/participants/{targetUserId:guid}/mute-chat")]
    public async Task<IActionResult> MuteChat(
        Guid theaterId, Guid targetUserId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        TheaterParticipant? requester = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == UserId, ct);
        if (requester == null || requester.Role is not ("host" or "moderator")) return Forbid();

        TheaterParticipant? target = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == targetUserId, ct);
        if (target == null) return NotFound();

        target.IsChatMuted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Playback ──────────────────────────────────────────────────────────────

    [HttpGet("{theaterId:guid}/playback")]
    public async Task<ActionResult<PlaybackStateDto>> GetPlayback(
        Guid theaterId, CancellationToken ct = default)
    {
        PlaybackState? state = await db.PlaybackStates.FindAsync([theaterId], ct);
        return state == null ? NotFound() : Ok(ToPlaybackDto(state));
    }

    [HttpPut("{theaterId:guid}/playback")]
    public async Task<ActionResult<PlaybackStateDto>> UpdatePlayback(
        Guid theaterId, [FromBody] UpdatePlaybackDto dto, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();
        if (theater.HostId != UserId) return Forbid();

        PlaybackState? state = await db.PlaybackStates.FindAsync([theaterId], ct);
        if (state == null)
        {
            state = new PlaybackState { TheaterId = theaterId };
            db.PlaybackStates.Add(state);
        }

        state.PositionSeconds = dto.PositionSeconds;
        state.IsPlaying = dto.IsPlaying;
        state.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:playback_sync",
            new
            {
                positionSeconds = state.PositionSeconds,
                isPlaying = state.IsPlaying,
                serverTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            }, ct);

        return Ok(ToPlaybackDto(state));
    }

    // ── Chat ──────────────────────────────────────────────────────────────────

    [HttpGet("{theaterId:guid}/chat")]
    public async Task<ActionResult<PagedResult<ChatMessageDto>>> GetChat(
        Guid theaterId, [FromQuery] string? cursor, [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        IQueryable<TheaterChatMessage> query = db.TheaterChatMessages
            .Where(m => m.TheaterId == theaterId && !m.IsDeleted);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(m => m.CreatedAt < before);
        }

        List<ChatMessageDto> messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit + 1)
            .Select(m => new ChatMessageDto(m.Id, m.TheaterId, m.SenderId, m.Content, m.CreatedAt, m.IsDeleted))
            .ToListAsync(ct);

        bool hasMore = messages.Count > limit;
        if (hasMore) messages.RemoveAt(messages.Count - 1);

        string? nextCursor = null;
        if (hasMore && messages.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(messages[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<ChatMessageDto>(messages, nextCursor, hasMore));
    }

    [HttpPost("{theaterId:guid}/chat")]
    public async Task<ActionResult<ChatMessageDto>> SendChat(
        Guid theaterId, [FromBody] SendChatMessageDto dto, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        TheaterParticipant? participant = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == UserId, ct);
        if (participant == null || participant.IsChatMuted) return Forbid();

        TheaterChatMessage message = new TheaterChatMessage
        {
            TheaterId = theaterId,
            SenderId = UserId,
            Content = dto.Content,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.TheaterChatMessages.Add(message);
        await db.SaveChangesAsync(ct);

        ChatMessageDto msgDto = ToChatDto(message);
        await rt.PublishAsync($"theater:{theaterId}", "theater:chat_message", msgDto, ct);

        return Ok(msgDto);
    }

    [HttpDelete("{theaterId:guid}/chat/{messageId:guid}")]
    public async Task<IActionResult> DeleteChat(
        Guid theaterId, Guid messageId, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        TheaterChatMessage? message = await db.TheaterChatMessages.FindAsync([messageId], ct);
        if (message == null || message.TheaterId != theaterId) return NotFound();

        TheaterParticipant? participant = await db.TheaterParticipants
            .FirstOrDefaultAsync(p => p.TheaterId == theaterId && p.UserId == UserId, ct);
        bool isModOrHost = participant?.Role is "host" or "moderator";
        if (!isModOrHost && message.SenderId != UserId) return Forbid();

        message.IsDeleted = true;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"theater:{theaterId}", "theater:chat_delete", new { messageId }, ct);
        return NoContent();
    }

    // ── Invite ────────────────────────────────────────────────────────────────

    [HttpPost("{theaterId:guid}/invite")]
    public async Task<IActionResult> Invite(
        Guid theaterId, [FromBody] InviteDto dto, CancellationToken ct = default)
    {
        Theater? theater = await db.Theaters.FindAsync([theaterId], ct);
        if (theater == null) return NotFound();

        await rt.PublishAsync($"user:{dto.UserId}", "theater:invite",
            new { theaterId, title = theater.Title, inviterUserId = UserId }, ct);

        return NoContent();
    }

    // ── Discovery ─────────────────────────────────────────────────────────────

    [HttpGet("discover")]
    public async Task<ActionResult<PagedResult<TheaterDto>>> Discover(
        [FromQuery] string? status, [FromQuery] string? category,
        [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        IQueryable<Theater> query = db.Theaters.Where(t => t.Visibility == "public");

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);
        else
            query = query.Where(t => t.Status == "live" || t.Status == "scheduled");

        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.Category == category);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(t => t.CreatedAt < before);
        }

        List<Theater> theaters = await query
            .OrderByDescending(t => t.ViewerCount)
            .ThenByDescending(t => t.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = theaters.Count > limit;
        if (hasMore) theaters.RemoveAt(theaters.Count - 1);

        string? nextCursor = null;
        if (hasMore && theaters.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(theaters[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<TheaterDto>(theaters.Select(ToDto), nextCursor, hasMore));
    }

    [HttpGet("discover/search")]
    public async Task<ActionResult<PagedResult<TheaterDto>>> Search(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required." });

        IQueryable<Theater> query = db.Theaters
            .Where(t => t.Visibility == "public"
                && (EF.Functions.ILike(t.Title, $"%{q}%")
                    || EF.Functions.ILike(t.Category, $"%{q}%")));

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(t => t.CreatedAt < before);
        }

        List<Theater> theaters = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = theaters.Count > limit;
        if (hasMore) theaters.RemoveAt(theaters.Count - 1);

        string? nextCursor = null;
        if (hasMore && theaters.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(theaters[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<TheaterDto>(theaters.Select(ToDto), nextCursor, hasMore));
    }

    // ── Projections ───────────────────────────────────────────────────────────

    private static TheaterDto ToDto(Theater t) => new(
        t.Id, t.HostId, t.Title, t.Description, t.Category, t.Tags,
        t.Visibility, t.Status, t.SourceType, t.SourceUrl, t.SourceMediaId,
        t.ViewerCount, t.MaxViewers, t.ScheduledAt, t.StartedAt, t.EndedAt, t.CreatedAt);

    private static TheaterParticipantDto ToParticipantDto(TheaterParticipant p) => new(
        p.TheaterId, p.UserId, p.Role, p.JoinedAt, p.LeftAt, p.IsChatMuted);

    private static PlaybackStateDto ToPlaybackDto(PlaybackState s) => new(
        s.TheaterId, s.PositionSeconds, s.IsPlaying, s.UpdatedAt);

    private static ChatMessageDto ToChatDto(TheaterChatMessage m) => new(
        m.Id, m.TheaterId, m.SenderId, m.Content, m.CreatedAt, m.IsDeleted);
}
