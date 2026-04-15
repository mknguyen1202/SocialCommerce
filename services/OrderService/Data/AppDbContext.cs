using Microsoft.EntityFrameworkCore;

namespace OrderService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<CheckoutSession> CheckoutSessions => Set<CheckoutSession>();
    public DbSet<CheckoutSessionItem> CheckoutSessionItems => Set<CheckoutSessionItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Shipment> Shipments => Set<Shipment>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Address>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Line1).HasMaxLength(200).IsRequired();
            e.Property(x => x.Line2).HasMaxLength(200);
            e.Property(x => x.City).HasMaxLength(100).IsRequired();
            e.Property(x => x.State).HasMaxLength(100).IsRequired();
            e.Property(x => x.PostalCode).HasMaxLength(20).IsRequired();
            e.Property(x => x.Country).HasMaxLength(3).IsRequired();
            e.HasIndex(x => x.UserId);
        });

        model.Entity<CheckoutSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Status).HasMaxLength(15).IsRequired();
            e.Property(x => x.CouponCode).HasMaxLength(50);
            e.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            e.Property(x => x.PaymentMethodToken).HasMaxLength(500);
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.ShippingAddress)
                .WithMany()
                .HasForeignKey(x => x.ShippingAddressId)
                .IsRequired(false);
        });

        model.Entity<CheckoutSessionItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.ProductTitle).HasMaxLength(300).IsRequired();
            e.Property(x => x.VariantLabel).HasMaxLength(200).IsRequired();
            e.Property(x => x.Sku).HasMaxLength(100).IsRequired();
            e.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            e.HasOne(x => x.Session)
                .WithMany(s => s.Items)
                .HasForeignKey(x => x.SessionId);
        });

        model.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Status).HasMaxLength(15).IsRequired();
            e.Property(x => x.PaymentRef).HasMaxLength(200);
            e.Property(x => x.CouponCode).HasMaxLength(50);
            e.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            e.HasIndex(x => x.BuyerId);
            e.HasIndex(x => x.Status);
            e.HasOne(x => x.ShippingAddress)
                .WithMany()
                .HasForeignKey(x => x.ShippingAddressId);
        });

        model.Entity<OrderItem>(e =>
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

        model.Entity<Shipment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Carrier).HasMaxLength(100).IsRequired();
            e.Property(x => x.TrackingNumber).HasMaxLength(200).IsRequired();
            e.Property(x => x.Status).HasMaxLength(15).IsRequired();
            e.HasOne(x => x.Order)
                .WithMany(o => o.Shipments)
                .HasForeignKey(x => x.OrderId);
        });
    }
}
