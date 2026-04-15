namespace ModerationService.Dtos
{
    public record CreateReport(Guid ReporterUserId, string TargetType, Guid TargetId, string? Reason, object? Details);
    public record ReportRead(Guid Id, Guid ReporterUserId, string TargetType, Guid TargetId, string? Reason, string Status, DateTimeOffset CreatedAt);

    public record QueueItem(Guid ReportId, Guid ReportedBy, string ContentType, Guid ContentId, string? Reason, DateTimeOffset CreatedAt);

    public record ApplyActionRequest(Guid ModeratorId, string Action, string Reason);
    public record ModerationActionRead(Guid Id, Guid? ReportId, Guid ModeratorId, string TargetType, Guid TargetId, string Action, string Reason, DateTimeOffset CreatedAt);

    public record AutoFlagRequest(string ContentType, Guid ContentId, string Content, AutoFlagScores Scores);
    public record AutoFlagScores(int Hate, int Sexual, int Violence, int SelfHarm);

    public record CreateDecision(string TargetType, Guid TargetId, string Action, Guid ActorUserId, int? TtlMinutes, string? Notes);
    public record DecisionRead(Guid Id, string TargetType, Guid TargetId, string Action, Guid ActorUserId, DateTimeOffset CreatedAt, int? TtlMinutes, string? Notes);
}
