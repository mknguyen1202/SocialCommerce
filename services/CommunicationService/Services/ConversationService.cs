using CommunicationService.Data;
using CommunicationService.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace CommunicationService.Services;

public class ConversationService(AppDbContext db, IRealTimePublisher rt)
{
    // ── Cursor helpers ────────────────────────────────────────────────────────

    private static string EncodeCursor(DateTimeOffset ts) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(ts.ToString("O")));

    private static DateTimeOffset? DecodeCursor(string? cursor)
    {
        if (string.IsNullOrEmpty(cursor)) return null;
        try
        {
            string raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return DateTimeOffset.Parse(raw);
        }
        catch { return null; }
    }

    // ── List ──────────────────────────────────────────────────────────────────

    public async Task<PagedResult<ConversationDto>> ListAsync(Guid userId, string? cursor, int limit, CancellationToken ct)
    {
        limit = Math.Clamp(limit, 1, 100);
        DateTimeOffset? since = DecodeCursor(cursor) ?? DateTimeOffset.UtcNow;

        List<Conversation> rows = await db.Conversations
            .AsNoTracking()
            .Where(c => c.Participants.Any(p => p.UserId == userId) && c.CreatedAt < since)
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit + 1)
            .Include(c => c.Participants)
            .ToListAsync(ct);

        bool hasMore = rows.Count > limit;
        if (hasMore) rows.RemoveAt(rows.Count - 1);

        string? nextCursor = hasMore ? EncodeCursor(rows[^1].CreatedAt) : null;
        return new PagedResult<ConversationDto>(rows.Select(Map).ToList(), nextCursor, hasMore);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<ConversationDto> CreateAsync(Guid userId, CreateConversationRequest req, CancellationToken ct)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        Conversation conv = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = req.Type,
            Name = req.Name,
            CreatedAt = now,
            CreatedBy = userId
        };

        List<ConversationParticipant> participants = new List<ConversationParticipant>
        {
            new() { ConversationId = conv.Id, UserId = userId, Role = "owner", JoinedAt = now, LastReadAt = now }
        };

        if (req.ParticipantIds != null)
        {
            foreach (Guid pid in req.ParticipantIds.Where(p => p != userId))
            {
                participants.Add(new() { ConversationId = conv.Id, UserId = pid, Role = "member", JoinedAt = now, LastReadAt = now });
            }
        }

        conv.Participants = participants;
        db.Conversations.Add(conv);
        await db.SaveChangesAsync(ct);

        ConversationDto dto = Map(conv);

        // Notify all participants
        foreach (var p in participants)
            await rt.PublishAsync($"user:{p.UserId}", "conversation:created", dto, ct);

        return dto;
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    public async Task<ConversationDto?> GetAsync(Guid conversationId, Guid userId, CancellationToken ct)
    {
        Conversation? conv = await db.Conversations
            .AsNoTracking()
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.Participants.Any(p => p.UserId == userId), ct);

        return conv == null ? null : Map(conv);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public async Task<ConversationDto?> UpdateAsync(Guid conversationId, Guid userId, UpdateConversationRequest req, CancellationToken ct)
    {
        Conversation? conv = await db.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conv == null) return null;
        if (!conv.Participants.Any(p => p.UserId == userId && p.Role is "owner" or "admin"))
            throw new UnauthorizedAccessException();

        if (req.Name != null) conv.Name = req.Name;
        if (req.AvatarUrl != null) conv.AvatarUrl = req.AvatarUrl;
        await db.SaveChangesAsync(ct);
        return Map(conv);
    }

    // ── Participants ──────────────────────────────────────────────────────────

    public async Task<bool> AddParticipantAsync(Guid conversationId, Guid requesterId, AddParticipantRequest req, CancellationToken ct)
    {
        Conversation? conv = await db.Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conv == null) return false;

        if (!conv.Participants.Any(p => p.UserId == requesterId && p.Role is "owner" or "admin"))
            throw new UnauthorizedAccessException();

        if (conv.Participants.Any(p => p.UserId == req.UserId)) return true; // already present

        DateTimeOffset now = DateTimeOffset.UtcNow;
        conv.Participants.Add(new() { ConversationId = conversationId, UserId = req.UserId, Role = req.Role, JoinedAt = now, LastReadAt = now });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RemoveParticipantAsync(Guid conversationId, Guid requesterId, Guid targetUserId, CancellationToken ct)
    {
        Conversation? conv = await db.Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conv == null) return false;

        ConversationParticipant? requester = conv.Participants.FirstOrDefault(p => p.UserId == requesterId);
        if (requester == null) return false;
        // Owner/admin can remove others; anyone can remove themselves
        if (targetUserId != requesterId && requester.Role is not ("owner" or "admin"))
            throw new UnauthorizedAccessException();

        ConversationParticipant? target = conv.Participants.FirstOrDefault(p => p.UserId == targetUserId);
        if (target == null) return false;
        conv.Participants.Remove(target);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Read receipt ──────────────────────────────────────────────────────────

    public async Task<bool> MarkReadAsync(Guid conversationId, Guid userId, CancellationToken ct)
    {
        ConversationParticipant? participant = await db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct);
        if (participant == null) return false;
        participant.LastReadAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static ConversationDto Map(Conversation c) => new(
        c.Id, c.Type, c.Name, c.AvatarUrl, c.CreatedAt, c.CreatedBy,
        c.Participants.Select(p => new ParticipantDto(p.UserId, p.Role, p.JoinedAt, p.LastReadAt)).ToList());
}
