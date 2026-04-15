using Microsoft.EntityFrameworkCore;

namespace CommerceService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewImage> ReviewImages => Set<ReviewImage>();
    public DbSet<ReviewHelpful> ReviewHelpfuls => Set<ReviewHelpful>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Category>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Parent)
                .WithMany(c => c.Children)
                .HasForeignKey(x => x.ParentId)
                .IsRequired(false);
        });

        model.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Availability).HasMaxLength(12).IsRequired();
            e.Property(x => x.Status).HasMaxLength(10).IsRequired();
            e.Property(x => x.Tags).HasColumnType("text[]");
            e.Property(x => x.AverageRating).HasColumnType("decimal(3,2)");
            e.HasOne(x => x.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(x => x.CategoryId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => x.VendorId);
        });

        model.Entity<ProductImage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.AltText).HasMaxLength(300);
            e.HasOne(x => x.Product)
                .WithMany(p => p.Images)
                .HasForeignKey(x => x.ProductId);
        });

        model.Entity<ProductVariant>(e =>
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

        model.Entity<Cart>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.CouponCode).HasMaxLength(50);
            e.HasOne(x => x.Coupon)
                .WithMany()
                .HasForeignKey(x => x.CouponCode)
                .HasPrincipalKey(c => c.Code)
                .IsRequired(false);
        });

        model.Entity<CartItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.HasOne(x => x.Cart)
                .WithMany(c => c.Items)
                .HasForeignKey(x => x.CartId);
            e.HasOne(x => x.Variant)
                .WithMany()
                .HasForeignKey(x => x.VariantId);
            e.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId);
        });

        model.Entity<Coupon>(e =>
        {
            e.HasKey(x => x.Code);
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.DiscountType).HasMaxLength(10).IsRequired();
            e.Property(x => x.DiscountValue).HasColumnType("decimal(10,2)");
        });

        model.Entity<Review>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Product)
                .WithMany(p => p.Reviews)
                .HasForeignKey(x => x.ProductId);
            e.HasIndex(x => new { x.ProductId, x.AuthorId });
        });

        model.Entity<ReviewImage>(e =>
        {
            e.HasKey(x => new { x.ReviewId, x.MediaId });
            e.HasOne(x => x.Review)
                .WithMany(r => r.Images)
                .HasForeignKey(x => x.ReviewId);
        });

        model.Entity<ReviewHelpful>(e =>
        {
            e.HasKey(x => new { x.ReviewId, x.UserId });
            e.HasOne(x => x.Review)
                .WithMany(r => r.Helpfuls)
                .HasForeignKey(x => x.ReviewId);
        });
    }
}
