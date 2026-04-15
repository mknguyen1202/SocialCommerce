namespace CommunicationService.Dtos;

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderId,
    string Content,
    Guid? ReplyToId,
    DateTimeOffset? EditedAt,
    DateTimeOffset? DeletedAt,
    DateTimeOffset CreatedAt,
    IReadOnlyList<AttachmentDto> Attachments,
    IReadOnlyList<ReactionDto> Reactions);

public record AttachmentDto(Guid Id, Guid MediaId, string Type);

public record ReactionDto(Guid MessageId, Guid UserId, string Emoji, DateTimeOffset CreatedAt);

public record SendMessageRequest(
    string Content,
    Guid? ReplyToId,
    IReadOnlyList<AttachmentRequest>? Attachments);

public record AttachmentRequest(Guid MediaId, string Type);

public record EditMessageRequest(string Content);

public record AddReactionRequest(string Emoji);

public record MessageSearchRequest(string Query);
