namespace InventoryService.Data;

public class Shop
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? ReturnPolicy { get; set; }
    public string? ShippingPolicy { get; set; }
    public string? ContactEmail { get; set; }
    public decimal AverageRating { get; set; }
    public int ProductCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<SellerProduct> Products { get; set; } = [];
}

public class SellerProduct
{
    public Guid Id { get; set; }
    public Guid ShopId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CategorySlug { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";           // draft|active|archived
    public string Availability { get; set; } = "in_stock";  // in_stock|low_stock|out_of_stock
    public string[] Tags { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Shop Shop { get; set; } = null!;
    public ICollection<SellerVariant> Variants { get; set; } = [];
    public ICollection<SellerProductImage> Images { get; set; } = [];
}

public class SellerVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public long PriceCents { get; set; }
    public string Currency { get; set; } = "USD";
    public int Stock { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = [];

    public SellerProduct Product { get; set; } = null!;
    public InventorySnapshot? Snapshot { get; set; }
}

public class SellerProductImage
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid MediaId { get; set; }
    public string AltText { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    public SellerProduct Product { get; set; } = null!;
}

public class InventorySnapshot
{
    public Guid VariantId { get; set; }
    public int Stock { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public DateTimeOffset? LastRestockedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public SellerVariant Variant { get; set; } = null!;
}

public class SellerOrder
{
    public Guid OrderId { get; set; }  // PK — mirror of OrderService Order.Id
    public Guid SellerId { get; set; }
    public string Status { get; set; } = "pending";  // pending|confirmed|shipped|delivered|cancelled|refunded
    public string BuyerName { get; set; } = string.Empty;
    public long TotalCents { get; set; }
    public DateTimeOffset PlacedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<SellerOrderItem> Items { get; set; } = [];
}

public class SellerOrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public Guid VariantId { get; set; }
    public string ProductTitle { get; set; } = string.Empty;
    public string VariantLabel { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public string Currency { get; set; } = "USD";

    public SellerOrder Order { get; set; } = null!;
}
