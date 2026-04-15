using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ModerationService.Data
{
    public class Report
    {
        [Key] public Guid Id { get; set; } = Guid.NewGuid();
        [Required] public Guid ReporterUserId { get; set; }
        [Required, MaxLength(24)] public string TargetType { get; set; } = default!; // post|comment|message|user
        [Required] public Guid TargetId { get; set; }
        [MaxLength(1024)] public string? Reason { get; set; }
        public string? DetailsJson { get; set; }
        [MaxLength(24)] public string Status { get; set; } = "open"; // open|reviewed|actioned|dismissed
        public Guid? ReviewedBy { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class ModerationAction
    {
        [Key] public Guid Id { get; set; } = Guid.NewGuid();
        public Guid? ReportId { get; set; }
        public Guid ModeratorId { get; set; }
        [Required, MaxLength(24)] public string TargetType { get; set; } = default!;
        [Required] public Guid TargetId { get; set; }
        [Required, MaxLength(24)] public string Action { get; set; } = default!; // remove|warn|mute|ban|dismiss
        public string Reason { get; set; } = default!;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class Decision
    {
        [Key] public Guid Id { get; set; } = Guid.NewGuid();
        [Required, MaxLength(24)] public string TargetType { get; set; } = default!; // post|comment|user
        [Required] public Guid TargetId { get; set; }
        [Required, MaxLength(24)] public string Action { get; set; } = default!; // remove|restrict|shadow|ban
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid ActorUserId { get; set; } // staff or system
        public TimeSpan? Ttl { get; set; }
        public string? Notes { get; set; }
    }

    public class AuditLog
    {
        [Key] public Guid Id { get; set; } = Guid.NewGuid();
        public Guid Who { get; set; }
        [MaxLength(64)] public string Action { get; set; } = default!;
        [MaxLength(24)] public string SubjectType { get; set; } = default!;
        public Guid SubjectId { get; set; }
        public string? DetailsJson { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}