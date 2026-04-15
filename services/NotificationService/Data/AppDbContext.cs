using Microsoft.EntityFrameworkCore;

namespace NotificationService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(n => n.Type).HasMaxLength(50).IsRequired();
            e.Property(n => n.Domain).HasMaxLength(15).IsRequired();
            e.Property(n => n.Title).HasMaxLength(200).IsRequired();
            e.Property(n => n.ActionUrl).HasMaxLength(512);

            // Common query patterns: per-user listing and unread count
            e.HasIndex(n => new { n.UserId, n.CreatedAt });
            e.HasIndex(n => new { n.UserId, n.IsRead });
        });
    }
}
