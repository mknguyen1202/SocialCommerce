namespace PresenceService.Dtos;

public record HeartbeatRequest(string Status);   // "online" | "idle" | "dnd"

public record BulkPresenceRequest(IReadOnlyList<Guid> UserIds);

public record PresenceDto(Guid UserId, string Status, DateTimeOffset LastSeen);

public record TypingRequest(Guid ConversationId, bool IsTyping);
