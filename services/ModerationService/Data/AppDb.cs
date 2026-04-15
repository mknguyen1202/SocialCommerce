using Microsoft.EntityFrameworkCore;

namespace ModerationService.Data
{
    public class AppDb : DbContext
    {
        public AppDb(DbContextOptions<AppDb> o) : base(o) { }
        public DbSet<Report> Reports => Set<Report>();
        public DbSet<ModerationAction> ModerationActions => Set<ModerationAction>();
        public DbSet<Decision> Decisions => Set<Decision>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder m)
        {
            m.Entity<Report>().HasIndex(x => new { x.TargetType, x.TargetId });
            m.Entity<Report>().HasIndex(x => x.Status);
            m.Entity<ModerationAction>().HasIndex(x => x.ReportId);
            m.Entity<ModerationAction>().HasIndex(x => new { x.TargetType, x.TargetId });
            m.Entity<Decision>().HasIndex(x => new { x.TargetType, x.TargetId, x.CreatedAt });
            m.Entity<AuditLog>().HasIndex(x => x.CreatedAt);
        }
    }
}
