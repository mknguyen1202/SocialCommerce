using CommunicationService.Data;
using CommunicationService.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace CommunicationService.Services;

public class MessageService(AppDbContext db, IRealTimePublisher rt)
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

    // ── List messages ─────────────────────────────────────────────────────────

    public async Task<PagedResult<MessageDto>> ListAsync(Guid conversationId, Guid userId, string? cursor, int limit, CancellationToken ct)
    {
        limit = Math.Clamp(limit, 1, 100);
        DateTimeOffset? before = DecodeCursor(cursor) ?? DateTimeOffset.UtcNow;

        bool inConv = await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct);
        if (!inConv) return new PagedResult<MessageDto>([], null, false);

        List<Message> rows = await db.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId && m.CreatedAt < before)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit + 1)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .ToListAsync(ct);

        bool hasMore = rows.Count > limit;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        string? nextCursor = hasMore ? EncodeCursor(rows[^1].CreatedAt) : null;
        return new PagedResult<MessageDto>(rows.Select(MapMessage).ToList(), nextCursor, hasMore);
    }

    // ── Send ──────────────────────────────────────────────────────────────────

    public async Task<MessageDto?> SendAsync(Guid conversationId, Guid senderId, SendMessageRequest req, CancellationToken ct)
    {
        bool inConv = await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == senderId, ct);
        if (!inConv) return null;

        Message msg = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = senderId,
            Content = req.Content,
            ReplyToId = req.ReplyToId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        if (req.Attachments != null)
        {
            msg.Attachments = req.Attachments.Select(a => new MessageAttachment
            {
                Id = Guid.NewGuid(),
                MessageId = msg.Id,
                MediaId = a.MediaId,
                Type = a.Type
            }).ToList();
        }

        db.Messages.Add(msg);
        await db.SaveChangesAsync(ct);

        MessageDto dto = MapMessage(msg);
        await rt.PublishAsync($"conversation:{conversationId}", "message:new", dto, ct);
        return dto;
    }

    // ── Edit ──────────────────────────────────────────────────────────────────

    public async Task<MessageDto?> EditAsync(Guid conversationId, Guid messageId, Guid userId, EditMessageRequest req, CancellationToken ct)
    {
        Message? msg = await db.Messages.Include(m => m.Attachments).Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ConversationId == conversationId, ct);
        if (msg == null || msg.DeletedAt != null) return null;
        if (msg.SenderId != userId) throw new UnauthorizedAccessException();

        msg.Content = req.Content;
        msg.EditedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        MessageDto dto = MapMessage(msg);
        await rt.PublishAsync($"conversation:{conversationId}", "message:edit",
            new { messageId, content = req.Content, editedAt = msg.EditedAt }, ct);
        return dto;
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public async Task<bool> DeleteAsync(Guid conversationId, Guid messageId, Guid userId, CancellationToken ct)
    {
        Message? msg = await db.Messages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ConversationId == conversationId, ct);
        if (msg == null) return false;
        if (msg.SenderId != userId) throw new UnauthorizedAccessException();

        msg.DeletedAt = DateTimeOffset.UtcNow;
        msg.Content = string.Empty;
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"conversation:{conversationId}", "message:delete", new { messageId }, ct);
        return true;
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    public async Task<bool> AddReactionAsync(Guid conversationId, Guid messageId, Guid userId, AddReactionRequest req, CancellationToken ct)
    {
        bool exists = await db.Messages.AnyAsync(m => m.Id == messageId && m.ConversationId == conversationId, ct);
        if (!exists) return false;

        bool already = await db.MessageReactions.AnyAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == req.Emoji, ct);
        if (already) return true;

        db.MessageReactions.Add(new MessageReaction
        {
            MessageId = messageId,
            UserId = userId,
            Emoji = req.Emoji,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"conversation:{conversationId}", "message:reaction",
            new { messageId, emoji = req.Emoji, userId, action = "add" }, ct);
        return true;
    }

    public async Task<bool> RemoveReactionAsync(Guid conversationId, Guid messageId, Guid userId, string emoji, CancellationToken ct)
    {
        MessageReaction? reaction = await db.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == emoji, ct);
        if (reaction == null) return false;

        db.MessageReactions.Remove(reaction);
        await db.SaveChangesAsync(ct);

        await rt.PublishAsync($"conversation:{conversationId}", "message:reaction",
            new { messageId, emoji, userId, action = "remove" }, ct);
        return true;
    }

    // ── Search ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MessageDto>> SearchAsync(Guid conversationId, Guid userId, string query, CancellationToken ct)
    {
        bool inConv = await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct);
        if (!inConv) return [];

        List<Message> rows = await db.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId && m.DeletedAt == null
                && EF.Functions.ILike(m.Content, $"%{query}%"))
            .OrderByDescending(m => m.CreatedAt)
            .Take(50)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .ToListAsync(ct);

        return rows.Select(MapMessage).ToList();
    }

    // ── Pins ──────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PinnedMessageDto>> GetPinsAsync(Guid conversationId, Guid userId, CancellationToken ct)
    {
        bool inConv = await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct);
        if (!inConv) return [];

        return await db.PinnedMessages
            .AsNoTracking()
            .Where(p => p.ConversationId == conversationId)
            .Select(p => new PinnedMessageDto(p.ConversationId, p.MessageId, p.PinnedBy, p.PinnedAt))
            .ToListAsync(ct);
    }

    public async Task<bool> PinAsync(Guid conversationId, Guid messageId, Guid userId, CancellationToken ct)
    {
        bool exists = await db.Messages.AnyAsync(m => m.Id == messageId && m.ConversationId == conversationId, ct);
        if (!exists) return false;
        bool already = await db.PinnedMessages.AnyAsync(p => p.ConversationId == conversationId && p.MessageId == messageId, ct);
        if (already) return true;

        db.PinnedMessages.Add(new PinnedMessage
        {
            ConversationId = conversationId,
            MessageId = messageId,
            PinnedBy = userId,
            PinnedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UnpinAsync(Guid conversationId, Guid messageId, Guid userId, CancellationToken ct)
    {
        PinnedMessage? pin = await db.PinnedMessages
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.MessageId == messageId, ct);
        if (pin == null) return false;
        db.PinnedMessages.Remove(pin);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static MessageDto MapMessage(Message m) => new(
        m.Id, m.ConversationId, m.SenderId, m.Content, m.ReplyToId,
        m.EditedAt, m.DeletedAt, m.CreatedAt,
        m.Attachments.Select(a => new AttachmentDto(a.Id, a.MediaId, a.Type)).ToList(),
        m.Reactions.Select(r => new ReactionDto(r.MessageId, r.UserId, r.Emoji, r.CreatedAt)).ToList());
}
