using Microsoft.EntityFrameworkCore;

namespace StreamingService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Theater> Theaters => Set<Theater>();
    public DbSet<TheaterParticipant> TheaterParticipants => Set<TheaterParticipant>();
    public DbSet<TheaterChatMessage> TheaterChatMessages => Set<TheaterChatMessage>();
    public DbSet<PlaybackState> PlaybackStates => Set<PlaybackState>();
    public DbSet<Emote> Emotes => Set<Emote>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Theater>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Category).HasMaxLength(100).IsRequired();
            e.Property(x => x.Tags).HasColumnType("text[]");
            e.Property(x => x.Visibility).HasMaxLength(10).IsRequired();
            e.Property(x => x.Status).HasMaxLength(10).IsRequired();
            e.Property(x => x.SourceType).HasMaxLength(15).IsRequired();
            e.Property(x => x.SourceUrl).HasMaxLength(2048);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.HostId);
            e.HasIndex(x => x.CreatedAt);
        });

        model.Entity<TheaterParticipant>(e =>
        {
            e.HasKey(x => new { x.TheaterId, x.UserId });
            e.Property(x => x.Role).HasMaxLength(12).IsRequired();
            e.HasOne(x => x.Theater)
                .WithMany(t => t.Participants)
                .HasForeignKey(x => x.TheaterId);
        });

        model.Entity<TheaterChatMessage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Content).IsRequired();
            e.HasOne(x => x.Theater)
                .WithMany(t => t.ChatMessages)
                .HasForeignKey(x => x.TheaterId);
            e.HasIndex(x => new { x.TheaterId, x.CreatedAt });
        });

        model.Entity<PlaybackState>(e =>
        {
            e.HasKey(x => x.TheaterId);
            e.HasOne(x => x.Theater)
                .WithOne(t => t.PlaybackState)
                .HasForeignKey<PlaybackState>(x => x.TheaterId);
        });

        model.Entity<Emote>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Code).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.ImageUrl).HasMaxLength(512).IsRequired();
            e.Property(x => x.Category).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Theater)
                .WithMany(t => t.Emotes)
                .HasForeignKey(x => x.TheaterId)
                .IsRequired(false);
        });
    }
}
