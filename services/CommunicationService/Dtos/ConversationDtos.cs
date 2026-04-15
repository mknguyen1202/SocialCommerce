namespace CommunicationService.Dtos;

// ── Shared ────────────────────────────────────────────────────────────────────

public record PagedResult<T>(IReadOnlyList<T> Items, string? NextCursor, bool HasMore);

// ── Conversations ─────────────────────────────────────────────────────────────

public record ConversationDto(
    Guid Id,
    string Type,
    string? Name,
    string? AvatarUrl,
    DateTimeOffset CreatedAt,
    Guid CreatedBy,
    IReadOnlyList<ParticipantDto> Participants);

public record ParticipantDto(Guid UserId, string Role, DateTimeOffset JoinedAt, DateTimeOffset LastReadAt);

public record CreateConversationRequest(
    string Type,           // 'dm' | 'room'
    string? Name,
    IReadOnlyList<Guid>? ParticipantIds);

public record UpdateConversationRequest(string? Name, string? AvatarUrl);

public record AddParticipantRequest(Guid UserId, string Role = "member");

// ── Pinned Messages ───────────────────────────────────────────────────────────

public record PinnedMessageDto(
    Guid ConversationId,
    Guid MessageId,
    Guid PinnedBy,
    DateTimeOffset PinnedAt);
