using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace AuthorizationService.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Entities.User> Users => Set<Entities.User>();
    public DbSet<Entities.ExternalLogin> ExternalLogins => Set<Entities.ExternalLogin>();
    public DbSet<Entities.Session> Sessions => Set<Entities.Session>();
    public DbSet<Entities.StoredToken> StoredTokens => Set<Entities.StoredToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // -------- User
        b.Entity<Entities.User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(160);
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Picture).HasMaxLength(500);

            e.HasIndex(x => x.Email);

            e.Property(x => x.CreatedAtUtc);
            e.Property(x => x.UpdatedAtUtc);
        });

        // -------- ExternalLogin
        b.Entity<Entities.ExternalLogin>(e =>
        {
            e.ToTable("external_logins");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);

            e.Property(x => x.Provider).HasMaxLength(40).IsRequired();
            e.Property(x => x.ProviderSubject).HasMaxLength(200).IsRequired();
            e.Property(x => x.Email).HasMaxLength(320);

            e.HasOne(x => x.User)
             .WithMany(u => u.ExternalLogins)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            // Each provider subject must be unique (avoid duplicate link)
            e.HasIndex(x => new { x.Provider, x.ProviderSubject }).IsUnique();
        });

        // -------- Session
        b.Entity<Entities.Session>(e =>
        {
            e.ToTable("sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(200);

            e.HasOne(x => x.User)
             .WithMany(u => u.Sessions)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(x => x.ClaimsJson);
            e.Property(x => x.CreatedAtUtc);
            e.Property(x => x.LastSeenUtc);
            e.Property(x => x.AbsoluteExpiryUtc);

            // Indexes go on the entity builder:
            e.HasIndex(x => x.LastSeenUtc);
        });

        // -------- StoredToken
        b.Entity<Entities.StoredToken>(e =>
        {
            e.ToTable("stored_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);

            e.Property(x => x.Provider).HasMaxLength(40).IsRequired();
            e.Property(x => x.ProtectedPayload).IsRequired();
            e.Property(x => x.Scopes).HasMaxLength(2000);

            e.HasOne(x => x.Session)
             .WithMany(s => s.Tokens)
             .HasForeignKey(x => x.SessionId)
             .OnDelete(DeleteBehavior.Cascade);

            // One token record per provider per session
            e.HasIndex(x => new { x.SessionId, x.Provider }).IsUnique();

            e.HasIndex(x => x.ExpiresAtUtc);
        });
    }
}
