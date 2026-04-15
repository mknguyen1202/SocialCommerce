using Microsoft.EntityFrameworkCore;

namespace MediaService.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");
        base.OnModelCreating(model);
    }
}
