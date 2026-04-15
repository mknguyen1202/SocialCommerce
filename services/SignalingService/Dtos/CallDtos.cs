namespace SignalingService.Dtos;

public record CallSessionDto(
    Guid Id,
    string Type,
    Guid InitiatorId,
    string Status,
    Guid? ConversationId,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    DateTimeOffset CreatedAt,
    IReadOnlyList<CallParticipantDto> Participants);

public record CallParticipantDto(
    Guid UserId,
    bool IsMuted,
    bool IsDeafened,
    bool IsCameraOn,
    bool IsScreenSharing,
    DateTimeOffset JoinedAt,
    DateTimeOffset? LeftAt);

public record InitiateCallRequest(
    string Type,                // 'voice' | 'video'
    Guid? ConversationId,
    IReadOnlyList<Guid> TargetUserIds);

public record SignalRequest(
    string SignalType,          // 'offer' | 'answer' | 'ice-candidate'
    Guid TargetUserId,
    string? Sdp,
    string? Candidate);

public record UpdateParticipantStateRequest(
    bool? IsMuted,
    bool? IsDeafened,
    bool? IsCameraOn,
    bool? IsScreenSharing);
