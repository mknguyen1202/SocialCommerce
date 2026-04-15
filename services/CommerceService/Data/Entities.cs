namespace CommerceService.Data;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public int DisplayOrder { get; set; }

    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}

public class Product
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public decimal AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string Availability { get; set; } = "in_stock";  // in_stock|low_stock|out_of_stock
    public string Status { get; set; } = "draft";           // draft|active|archived
    public string[] Tags { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public ICollection<ProductImage> Images { get; set; } = [];
    public ICollection<ProductVariant> Variants { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
}

public class ProductImage
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid MediaId { get; set; }
    public string AltText { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    public Product Product { get; set; } = null!;
}

public class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public long PriceCents { get; set; }
    public string Currency { get; set; } = "USD";
    public int Stock { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = [];

    public Product Product { get; set; } = null!;
}

public class Cart
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? CouponCode { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<CartItem> Items { get; set; } = [];
    public Coupon? Coupon { get; set; }
}

public class CartItem
{
    public Guid Id { get; set; }
    public Guid CartId { get; set; }
    public Guid ProductId { get; set; }
    public Guid VariantId { get; set; }
    public int Quantity { get; set; }
    public DateTimeOffset AddedAt { get; set; }

    public Cart Cart { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant Variant { get; set; } = null!;
}

public class Coupon
{
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "percent";  // percent|fixed
    public decimal DiscountValue { get; set; }
    public long? MinOrderCents { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Review
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid? OrderItemId { get; set; }
    public short Rating { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int HelpfulCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Product Product { get; set; } = null!;
    public ICollection<ReviewImage> Images { get; set; } = [];
    public ICollection<ReviewHelpful> Helpfuls { get; set; } = [];
}

public class ReviewImage
{
    public Guid ReviewId { get; set; }
    public Guid MediaId { get; set; }

    public Review Review { get; set; } = null!;
}

public class ReviewHelpful
{
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }

    public Review Review { get; set; } = null!;
}
