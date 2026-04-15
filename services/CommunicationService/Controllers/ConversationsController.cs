using CommunicationService.Dtos;
using CommunicationService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CommunicationService.Controllers;

[ApiController]
[Authorize]
[Route("conversations")]
public class ConversationsController(ConversationService convSvc, MessageService msgSvc) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // ── Conversations ─────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<ActionResult<PagedResult<ConversationDto>>> List(
        [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        PagedResult<ConversationDto> result = await convSvc.ListAsync(UserId, cursor, limit, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ConversationDto>> Create(
        [FromBody] CreateConversationRequest req, CancellationToken ct = default)
    {
        ConversationDto conv = await convSvc.CreateAsync(UserId, req, ct);
        return CreatedAtAction(nameof(Get), new { id = conv.Id }, conv);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConversationDto>> Get(Guid id, CancellationToken ct = default)
    {
        ConversationDto? conv = await convSvc.GetAsync(id, UserId, ct);
        return conv == null ? NotFound() : Ok(conv);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ConversationDto>> Update(
        Guid id, [FromBody] UpdateConversationRequest req, CancellationToken ct = default)
    {
        try
        {
            ConversationDto? conv = await convSvc.UpdateAsync(id, UserId, req, ct);
            return conv == null ? NotFound() : Ok(conv);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Participants ──────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/participants")]
    public async Task<IActionResult> AddParticipant(
        Guid id, [FromBody] AddParticipantRequest req, CancellationToken ct = default)
    {
        try
        {
            bool ok = await convSvc.AddParticipantAsync(id, UserId, req, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}/participants/{userId:guid}")]
    public async Task<IActionResult> RemoveParticipant(
        Guid id, Guid userId, CancellationToken ct = default)
    {
        try
        {
            bool ok = await convSvc.RemoveParticipantAsync(id, UserId, userId, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/messages")]
    public async Task<ActionResult<PagedResult<MessageDto>>> ListMessages(
        Guid id, [FromQuery] string? cursor, [FromQuery] int limit = 30, CancellationToken ct = default)
    {
        PagedResult<MessageDto> result = await msgSvc.ListAsync(id, UserId, cursor, limit, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        Guid id, [FromBody] SendMessageRequest req, CancellationToken ct = default)
    {
        MessageDto? msg = await msgSvc.SendAsync(id, UserId, req, ct);
        return msg == null ? Forbid() : Ok(msg);
    }

    [HttpPatch("{id:guid}/messages/{messageId:guid}")]
    public async Task<ActionResult<MessageDto>> EditMessage(
        Guid id, Guid messageId, [FromBody] EditMessageRequest req, CancellationToken ct = default)
    {
        try
        {
            MessageDto? msg = await msgSvc.EditAsync(id, messageId, UserId, req, ct);
            return msg == null ? NotFound() : Ok(msg);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}/messages/{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(
        Guid id, Guid messageId, CancellationToken ct = default)
    {
        try
        {
            bool ok = await msgSvc.DeleteAsync(id, messageId, UserId, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/messages/{messageId:guid}/reactions")]
    public async Task<IActionResult> AddReaction(
        Guid id, Guid messageId, [FromBody] AddReactionRequest req, CancellationToken ct = default)
    {
        bool ok = await msgSvc.AddReactionAsync(id, messageId, UserId, req, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/messages/{messageId:guid}/reactions/{emoji}")]
    public async Task<IActionResult> RemoveReaction(
        Guid id, Guid messageId, string emoji, CancellationToken ct = default)
    {
        bool ok = await msgSvc.RemoveReactionAsync(id, messageId, UserId, emoji, ct);
        return ok ? NoContent() : NotFound();
    }

    // ── Search ────────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/messages/search")]
    public async Task<ActionResult<IReadOnlyList<MessageDto>>> SearchMessages(
        Guid id, [FromQuery] string q = "", CancellationToken ct = default)
    {
        IReadOnlyList<MessageDto> results = await msgSvc.SearchAsync(id, UserId, q, ct);
        return Ok(results);
    }

    // ── Pins ──────────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/pins")]
    public async Task<ActionResult<IReadOnlyList<PinnedMessageDto>>> GetPins(
        Guid id, CancellationToken ct = default)
    {
        IReadOnlyList<PinnedMessageDto> pins = await msgSvc.GetPinsAsync(id, UserId, ct);
        return Ok(pins);
    }

    [HttpPut("{id:guid}/pins/{messageId:guid}")]
    public async Task<IActionResult> PinMessage(Guid id, Guid messageId, CancellationToken ct = default)
    {
        bool ok = await msgSvc.PinAsync(id, messageId, UserId, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/pins/{messageId:guid}")]
    public async Task<IActionResult> UnpinMessage(Guid id, Guid messageId, CancellationToken ct = default)
    {
        bool ok = await msgSvc.UnpinAsync(id, messageId, UserId, ct);
        return ok ? NoContent() : NotFound();
    }

    // ── Read receipt ──────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct = default)
    {
        bool ok = await convSvc.MarkReadAsync(id, UserId, ct);
        return ok ? NoContent() : NotFound();
    }
}
