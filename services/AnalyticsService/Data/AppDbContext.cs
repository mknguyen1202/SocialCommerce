using Microsoft.EntityFrameworkCore;

namespace AnalyticsService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SalesSummary> SalesSummaries => Set<SalesSummary>();
    public DbSet<ProductSalesSummary> ProductSalesSummaries => Set<ProductSalesSummary>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<SalesSummary>(e =>
        {
            e.HasKey(x => new { x.ShopId, x.Date });
            e.HasIndex(x => x.ShopId);
        });

        model.Entity<ProductSalesSummary>(e =>
        {
            e.HasKey(x => new { x.ShopId, x.ProductId, x.Date });
            e.HasIndex(x => new { x.ShopId, x.Date });
        });
    }
}
