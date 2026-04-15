using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace SearchService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SearchEntry> SearchEntries => Set<SearchEntry>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<SearchEntry>(e =>
        {
            e.ToTable("search_entries");

            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.EntityType).HasMaxLength(15).IsRequired();
            e.Property(x => x.Title).IsRequired();
            e.Property(x => x.DomainData).HasColumnType("jsonb");

            e.Property(x => x.SearchVector)
                .HasColumnType("tsvector");

            // GIN index on the tsvector column for fast full-text queries
            e.HasIndex(x => x.SearchVector)
                .HasMethod("GIN");

            // Unique constraint: one entry per entity
            e.HasIndex(x => new { x.EntityType, x.EntityId })
                .IsUnique();

            e.HasIndex(x => x.EntityType);
            e.HasIndex(x => x.UpdatedAt);
        });
    }

    /// <summary>
    /// Ensures the PostgreSQL trigger function and trigger exist so that
    /// <c>SearchVector</c> is auto-populated from <c>Title</c> + <c>Body</c>.
    /// Safe to call on every startup — uses IF NOT EXISTS.
    /// </summary>
    public async Task EnsureSearchInfrastructureAsync()
    {
        string sql = """
            CREATE OR REPLACE FUNCTION search_entries_vector_update() RETURNS trigger AS $$
            BEGIN
                NEW."SearchVector" :=
                    setweight(to_tsvector('english', coalesce(NEW."Title", '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(NEW."Body", '')), 'B');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_search_entries_vector'
                ) THEN
                    CREATE TRIGGER trg_search_entries_vector
                        BEFORE INSERT OR UPDATE ON search_entries
                        FOR EACH ROW
                        EXECUTE FUNCTION search_entries_vector_update();
                END IF;
            END $$;
            """;

        await Database.ExecuteSqlRawAsync(sql);
    }
}
