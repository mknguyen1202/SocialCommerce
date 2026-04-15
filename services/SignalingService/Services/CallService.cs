using Microsoft.EntityFrameworkCore;
using SignalingService.Data;
using SignalingService.Dtos;

namespace SignalingService.Services;

public class CallService(AppDbContext db, IRealTimePublisher rt)
{
    // ── Initiate ──────────────────────────────────────────────────────────────

    public async Task<CallSessionDto> InitiateAsync(Guid initiatorId, InitiateCallRequest req, CancellationToken ct)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        CallSession session = new CallSession
        {
            Id = Guid.NewGuid(),
            Type = req.Type,
            InitiatorId = initiatorId,
            Status = "ringing",
            ConversationId = req.ConversationId,
            CreatedAt = now
        };

        session.Participants.Add(new CallParticipant
        {
            CallSessionId = session.Id,
            UserId = initiatorId,
            JoinedAt = now
        });

        db.CallSessions.Add(session);
        await db.SaveChangesAsync(ct);

        CallSessionDto dto = MapSession(session);

        // Notify each target user of incoming call
        foreach (Guid target in req.TargetUserIds)
            await rt.PublishAsync($"user:{target}", "call:incoming", dto, ct);

        return dto;
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    public async Task<CallSessionDto?> GetAsync(Guid callId, CancellationToken ct)
    {
        CallSession? session = await db.CallSessions
            .AsNoTracking()
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == callId, ct);
        return session == null ? null : MapSession(session);
    }

    // ── Join ──────────────────────────────────────────────────────────────────

    public async Task<CallSessionDto?> JoinAsync(Guid callId, Guid userId, CancellationToken ct)
    {
        CallSession? session = await db.CallSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == callId, ct);

        if (session == null || session.Status == "ended") return null;

        if (!session.Participants.Any(p => p.UserId == userId))
        {
            DateTimeOffset now = DateTimeOffset.UtcNow;
            session.Participants.Add(new CallParticipant
            {
                CallSessionId = callId,
                UserId = userId,
                JoinedAt = now
            });

            if (session.Status == "ringing")
            {
                session.Status = "active";
                session.StartedAt = now;
            }

            await db.SaveChangesAsync(ct);
        }

        CallSessionDto dto = MapSession(session);
        string group = session.ConversationId.HasValue
            ? $"conversation:{session.ConversationId}"
            : $"user:{session.InitiatorId}";

        await rt.PublishAsync(group, "call:joined",
            MapParticipant(session.Participants.First(p => p.UserId == userId)), ct);

        return dto;
    }

    // ── Leave ─────────────────────────────────────────────────────────────────

    public async Task<bool> LeaveAsync(Guid callId, Guid userId, CancellationToken ct)
    {
        CallSession? session = await db.CallSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == callId, ct);

        if (session == null) return false;

        CallParticipant? participant = session.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null) return false;

        participant.LeftAt = DateTimeOffset.UtcNow;

        // End the call if no active participants remain
        bool stillActive = session.Participants.Any(p => p.UserId != userId && p.LeftAt == null);
        if (!stillActive)
        {
            session.Status = "ended";
            session.EndedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        string group = session.ConversationId.HasValue
            ? $"conversation:{session.ConversationId}"
            : $"user:{session.InitiatorId}";

        await rt.PublishAsync(group, "call:left", new { userId }, ct);

        if (!stillActive)
            await rt.PublishAsync(group, "call:ended", new { callId }, ct);

        return true;
    }

    // ── Signal (SDP / ICE relay) ──────────────────────────────────────────────

    public async Task<bool> SignalAsync(Guid callId, Guid senderId, SignalRequest req, CancellationToken ct)
    {
        bool exists = await db.CallSessions.AnyAsync(s => s.Id == callId && s.Status != "ended", ct);
        if (!exists) return false;

        await rt.PublishAsync($"user:{req.TargetUserId}", "call:signal", new
        {
            callId,
            type = req.SignalType,
            sdp = req.Sdp,
            candidate = req.Candidate,
            fromUserId = senderId
        }, ct);

        return true;
    }

    // ── Update participant state ───────────────────────────────────────────────

    public async Task<bool> UpdateParticipantStateAsync(
        Guid callId, Guid userId, UpdateParticipantStateRequest req, CancellationToken ct)
    {
        CallSession? session = await db.CallSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == callId, ct);

        if (session == null) return false;

        CallParticipant? participant = session.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null) return false;

        if (req.IsMuted.HasValue) participant.IsMuted = req.IsMuted.Value;
        if (req.IsDeafened.HasValue) participant.IsDeafened = req.IsDeafened.Value;
        if (req.IsCameraOn.HasValue) participant.IsCameraOn = req.IsCameraOn.Value;
        if (req.IsScreenSharing.HasValue) participant.IsScreenSharing = req.IsScreenSharing.Value;

        await db.SaveChangesAsync(ct);

        string group = session.ConversationId.HasValue
            ? $"conversation:{session.ConversationId}"
            : $"user:{session.InitiatorId}";

        await rt.PublishAsync(group, "call:state_update", MapParticipant(participant), ct);
        return true;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static CallSessionDto MapSession(CallSession s) => new(
        s.Id, s.Type, s.InitiatorId, s.Status, s.ConversationId,
        s.StartedAt, s.EndedAt, s.CreatedAt,
        s.Participants.Select(MapParticipant).ToList());

    private static CallParticipantDto MapParticipant(CallParticipant p) => new(
        p.UserId, p.IsMuted, p.IsDeafened, p.IsCameraOn, p.IsScreenSharing,
        p.JoinedAt, p.LeftAt);
}
