namespace OrderService.Data;

public class Address
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;  // ISO 3166-1 alpha-2
    public bool IsDefault { get; set; }
}

public class CheckoutSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ShippingAddressId { get; set; }
    public string? PaymentMethodToken { get; set; }
    public string Status { get; set; } = "pending";  // pending|address_set|payment_set|placed|expired
    public string? CouponCode { get; set; }
    public long SubtotalCents { get; set; }
    public long DiscountCents { get; set; }
    public long ShippingCents { get; set; }
    public long TaxCents { get; set; }
    public long TotalCents { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Address? ShippingAddress { get; set; }
    public ICollection<CheckoutSessionItem> Items { get; set; } = [];
}

public class CheckoutSessionItem
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid ProductId { get; set; }
    public Guid VariantId { get; set; }
    public Guid VendorId { get; set; }
    public string ProductTitle { get; set; } = string.Empty;
    public string VariantLabel { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public string Currency { get; set; } = "USD";

    public CheckoutSession Session { get; set; } = null!;
}

public class Order
{
    public Guid Id { get; set; }
    public Guid BuyerId { get; set; }
    public string Status { get; set; } = "pending";  // pending|confirmed|shipped|delivered|cancelled|refunded
    public Guid ShippingAddressId { get; set; }
    public string? PaymentRef { get; set; }
    public long SubtotalCents { get; set; }
    public long ShippingCents { get; set; }
    public long TaxCents { get; set; }
    public long TotalCents { get; set; }
    public string Currency { get; set; } = "USD";
    public string? CouponCode { get; set; }
    public long DiscountCents { get; set; }
    public DateTimeOffset PlacedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Address ShippingAddress { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
    public ICollection<Shipment> Shipments { get; set; } = [];
}

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public Guid VariantId { get; set; }
    public Guid VendorId { get; set; }
    public string ProductTitle { get; set; } = string.Empty;
    public string VariantLabel { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public string Currency { get; set; } = "USD";

    public Order Order { get; set; } = null!;
}

public class Shipment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string Carrier { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";  // pending|in_transit|delivered|failed
    public DateOnly? EstimatedDelivery { get; set; }
    public DateTimeOffset? ShippedAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }

    public Order Order { get; set; } = null!;
}
