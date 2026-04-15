namespace CommerceService.Dtos;

public record CategoryDto(
    Guid Id,
    string Name,
    string Slug,
    Guid? ParentId,
    int DisplayOrder,
    IEnumerable<CategoryDto>? Children);

public record ProductSummaryDto(
    Guid Id,
    Guid VendorId,
    string Title,
    string Category,
    decimal AverageRating,
    int ReviewCount,
    string Availability,
    string Status,
    string[] Tags,
    long? MinPriceCents,
    string? Currency,
    DateTimeOffset CreatedAt);

public record ProductDto(
    Guid Id,
    Guid VendorId,
    string Title,
    string Description,
    Guid CategoryId,
    string Category,
    decimal AverageRating,
    int ReviewCount,
    string Availability,
    string Status,
    string[] Tags,
    IEnumerable<ProductImageDto> Images,
    IEnumerable<ProductVariantDto> Variants,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record ProductImageDto(
    Guid Id,
    Guid MediaId,
    string AltText,
    int DisplayOrder);

public record ProductVariantDto(
    Guid Id,
    string Label,
    string Sku,
    long PriceCents,
    string Currency,
    int Stock,
    Dictionary<string, string> Attributes);

public record ReviewDto(
    Guid Id,
    Guid ProductId,
    Guid AuthorId,
    Guid? OrderItemId,
    short Rating,
    string Title,
    string Body,
    int HelpfulCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record CreateReviewDto(
    short Rating,
    string Title,
    string Body,
    Guid? OrderItemId);

public record CartDto(
    Guid Id,
    Guid UserId,
    string? CouponCode,
    IEnumerable<CartItemDto> Items,
    long SubtotalCents,
    long DiscountCents,
    long TotalCents,
    DateTimeOffset UpdatedAt);

public record CartItemDto(
    Guid Id,
    Guid ProductId,
    string ProductTitle,
    Guid VariantId,
    string VariantLabel,
    string Sku,
    long PriceCents,
    string Currency,
    int Quantity,
    DateTimeOffset AddedAt);

public record AddCartItemDto(
    Guid ProductId,
    Guid VariantId,
    int Quantity);

public record UpdateCartItemDto(int Quantity);

public record ApplyCouponDto(string Code);

public record PagedResult<T>(
    IEnumerable<T> Items,
    string? NextCursor,
    bool HasMore);
