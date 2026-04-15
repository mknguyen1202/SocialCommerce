namespace SignalingService.Data;

public class CallSession
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "voice";       // 'voice' | 'video'
    public Guid InitiatorId { get; set; }
    public string Status { get; set; } = "ringing";   // 'ringing' | 'active' | 'ended'
    public Guid? ConversationId { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<CallParticipant> Participants { get; set; } = [];
}

public class CallParticipant
{
    public Guid CallSessionId { get; set; }
    public Guid UserId { get; set; }
    public bool IsMuted { get; set; }
    public bool IsDeafened { get; set; }
    public bool IsCameraOn { get; set; }
    public bool IsScreenSharing { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset? LeftAt { get; set; }

    public CallSession CallSession { get; set; } = null!;
}
