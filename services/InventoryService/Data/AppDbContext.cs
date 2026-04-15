using Microsoft.EntityFrameworkCore;

namespace InventoryService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<SellerProduct> Products => Set<SellerProduct>();
    public DbSet<SellerVariant> Variants => Set<SellerVariant>();
    public DbSet<SellerProductImage> ProductImages => Set<SellerProductImage>();
    public DbSet<InventorySnapshot> InventorySnapshots => Set<InventorySnapshot>();
    public DbSet<SellerOrder> SellerOrders => Set<SellerOrder>();
    public DbSet<SellerOrderItem> SellerOrderItems => Set<SellerOrderItem>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Shop>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.OwnerId).IsUnique();
            e.Property(x => x.Description).IsRequired();
            e.Property(x => x.LogoUrl).HasMaxLength(512);
            e.Property(x => x.BannerUrl).HasMaxLength(512);
            e.Property(x => x.ContactEmail).HasMaxLength(320);
            e.Property(x => x.AverageRating).HasPrecision(3, 2);
        });

        model.Entity<SellerProduct>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.CategorySlug).HasMaxLength(100).IsRequired();
            e.Property(x => x.Status).HasMaxLength(10).IsRequired();
            e.Property(x => x.Availability).HasMaxLength(12).IsRequired();
            e.Property(x => x.Tags).HasColumnType("text[]");
            e.HasIndex(x => x.ShopId);
            e.HasIndex(x => x.Status);
            e.HasOne(x => x.Shop)
                .WithMany(s => s.Products)
                .HasForeignKey(x => x.ShopId);
        });

        model.Entity<SellerVariant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Label).HasMaxLength(200).IsRequired();
            e.Property(x => x.Sku).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Sku).IsUnique();
            e.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            e.Property(x => x.Attributes).HasColumnType("jsonb");
            e.HasOne(x => x.Product)
                .WithMany(p => p.Variants)
                .HasForeignKey(x => x.ProductId);
        });

        model.Entity<SellerProductImage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.AltText).HasMaxLength(300);
            e.HasOne(x => x.Product)
                .WithMany(p => p.Images)
                .HasForeignKey(x => x.ProductId);
        });

        model.Entity<InventorySnapshot>(e =>
        {
            e.HasKey(x => x.VariantId);
            e.HasOne(x => x.Variant)
                .WithOne(v => v.Snapshot)
                .HasForeignKey<InventorySnapshot>(x => x.VariantId);
        });

        model.Entity<SellerOrder>(e =>
        {
            e.HasKey(x => x.OrderId);
            e.Property(x => x.Status).HasMaxLength(15).IsRequired();
            e.Property(x => x.BuyerName).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.SellerId);
            e.HasIndex(x => x.Status);
        });

        model.Entity<SellerOrderItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.ProductTitle).HasMaxLength(300).IsRequired();
            e.Property(x => x.VariantLabel).HasMaxLength(200).IsRequired();
            e.Property(x => x.Sku).HasMaxLength(100).IsRequired();
            e.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            e.HasOne(x => x.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(x => x.OrderId);
        });
    }
}
