using Microsoft.EntityFrameworkCore;
using SignalingService.Data;

namespace SignalingService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<CallSession> CallSessions => Set<CallSession>();
    public DbSet<CallParticipant> CallParticipants => Set<CallParticipant>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<CallSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Type).HasMaxLength(5).IsRequired();
            e.Property(x => x.Status).HasMaxLength(10).IsRequired();
            e.HasIndex(x => x.InitiatorId);
            e.HasIndex(x => x.ConversationId);
        });

        model.Entity<CallParticipant>(e =>
        {
            e.HasKey(x => new { x.CallSessionId, x.UserId });
            e.HasOne(x => x.CallSession)
                .WithMany(s => s.Participants)
                .HasForeignKey(x => x.CallSessionId);
        });
    }
}
