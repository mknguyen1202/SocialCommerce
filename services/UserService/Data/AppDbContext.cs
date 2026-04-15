using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using UserService.Auth.IdentityMapping;


namespace UserService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }


        public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
        public DbSet<ExternalLoginLink> ExternalLoginLinks => Set<ExternalLoginLink>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasPostgresExtension("uuid-ossp");
            modelBuilder.Entity<UserProfile>(e =>
            {
                e.HasIndex(x => x.IdentityId).IsUnique();
                e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
                e.HasIndex(x => x.Username).IsUnique().HasFilter("\"Username\" IS NOT NULL");
            });

            modelBuilder.Entity<ExternalLoginLink>(e =>
            {
                e.HasKey(x => new { x.Provider, x.ProviderKey });
                e.HasIndex(x => x.UserId);
                e.Property(x => x.Provider).HasMaxLength(50);
                e.Property(x => x.ProviderKey).HasMaxLength(256);
            });
        }
    }
}