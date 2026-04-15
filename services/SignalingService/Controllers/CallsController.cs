using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignalingService.Dtos;
using SignalingService.Services;
using System.Security.Claims;

namespace SignalingService.Controllers;

[ApiController]
[Authorize]
[Route("calls")]
public class CallsController(CallService callSvc) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // POST /calls
    [HttpPost]
    public async Task<ActionResult<CallSessionDto>> Initiate(
        [FromBody] InitiateCallRequest req, CancellationToken ct = default)
    {
        CallSessionDto session = await callSvc.InitiateAsync(UserId, req, ct);
        return CreatedAtAction(nameof(Get), new { callId = session.Id }, session);
    }

    // GET /calls/{callId}
    [HttpGet("{callId:guid}")]
    public async Task<ActionResult<CallSessionDto>> Get(Guid callId, CancellationToken ct = default)
    {
        CallSessionDto? session = await callSvc.GetAsync(callId, ct);
        return session == null ? NotFound() : Ok(session);
    }

    // POST /calls/{callId}/join
    [HttpPost("{callId:guid}/join")]
    public async Task<ActionResult<CallSessionDto>> Join(Guid callId, CancellationToken ct = default)
    {
        CallSessionDto? session = await callSvc.JoinAsync(callId, UserId, ct);
        return session == null ? NotFound() : Ok(session);
    }

    // POST /calls/{callId}/leave
    [HttpPost("{callId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid callId, CancellationToken ct = default)
    {
        bool ok = await callSvc.LeaveAsync(callId, UserId, ct);
        return ok ? NoContent() : NotFound();
    }

    // POST /calls/{callId}/signal
    [HttpPost("{callId:guid}/signal")]
    public async Task<IActionResult> Signal(
        Guid callId, [FromBody] SignalRequest req, CancellationToken ct = default)
    {
        bool ok = await callSvc.SignalAsync(callId, UserId, req, ct);
        return ok ? NoContent() : NotFound();
    }

    // PATCH /calls/{callId}/participants/{userId}/state
    [HttpPatch("{callId:guid}/participants/{userId:guid}/state")]
    public async Task<IActionResult> UpdateState(
        Guid callId, Guid userId,
        [FromBody] UpdateParticipantStateRequest req,
        CancellationToken ct = default)
    {
        // Only the participant can update their own state
        if (userId != UserId) return Forbid();
        bool ok = await callSvc.UpdateParticipantStateAsync(callId, userId, req, ct);
        return ok ? NoContent() : NotFound();
    }
}
