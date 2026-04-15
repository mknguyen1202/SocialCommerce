using Microsoft.EntityFrameworkCore;

namespace AdService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AdCampaign> AdCampaigns => Set<AdCampaign>();
    public DbSet<CampaignProduct> CampaignProducts => Set<CampaignProduct>();
    public DbSet<CampaignMetrics> CampaignMetrics => Set<CampaignMetrics>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<AdCampaign>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Status).HasMaxLength(10).IsRequired();
            e.HasIndex(x => x.ShopId);
            e.HasIndex(x => x.Status);
        });

        model.Entity<CampaignProduct>(e =>
        {
            e.HasKey(x => new { x.CampaignId, x.ProductId });
            e.HasOne(x => x.Campaign)
                .WithMany(c => c.Products)
                .HasForeignKey(x => x.CampaignId);
        });

        model.Entity<CampaignMetrics>(e =>
        {
            e.HasKey(x => x.CampaignId);
            e.HasOne(x => x.Campaign)
                .WithOne(c => c.Metrics)
                .HasForeignKey<CampaignMetrics>(x => x.CampaignId);
        });
    }
}
