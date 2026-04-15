namespace StreamingService.Dtos;

public record CreateTheaterDto(
    string Title,
    string? Description,
    string Category,
    string[] Tags,
    string Visibility,
    string SourceType,
    string? SourceUrl,
    Guid? SourceMediaId,
    int? MaxViewers,
    DateTimeOffset? ScheduledAt);

public record UpdateTheaterDto(
    string? Title,
    string? Description,
    string[]? Tags);

public record TheaterDto(
    Guid Id,
    Guid HostId,
    string Title,
    string? Description,
    string Category,
    string[] Tags,
    string Visibility,
    string Status,
    string SourceType,
    string? SourceUrl,
    Guid? SourceMediaId,
    int ViewerCount,
    int? MaxViewers,
    DateTimeOffset? ScheduledAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    DateTimeOffset CreatedAt);

public record TheaterParticipantDto(
    Guid TheaterId,
    Guid UserId,
    string Role,
    DateTimeOffset JoinedAt,
    DateTimeOffset? LeftAt,
    bool IsChatMuted);

public record PlaybackStateDto(
    Guid TheaterId,
    float PositionSeconds,
    bool IsPlaying,
    DateTimeOffset UpdatedAt);

public record UpdatePlaybackDto(
    float PositionSeconds,
    bool IsPlaying);

public record ChatMessageDto(
    Guid Id,
    Guid TheaterId,
    Guid SenderId,
    string Content,
    DateTimeOffset CreatedAt,
    bool IsDeleted);

public record SendChatMessageDto(string Content);

public record EmoteDto(
    Guid Id,
    string Code,
    string ImageUrl,
    string Category,
    Guid? TheaterId,
    Guid CreatedBy);

public record CreateEmoteDto(
    string Code,
    string ImageUrl);

public record InviteDto(Guid UserId);

public record PagedResult<T>(
    IEnumerable<T> Items,
    string? NextCursor,
    bool HasMore);
