namespace InventoryService.Dtos;

public record PagedResult<T>(IEnumerable<T> Items, string? NextCursor, bool HasMore);

// ── Shop ──────────────────────────────────────────────────────────────────────

public record ShopDto(
    Guid Id,
    Guid OwnerId,
    string Name,
    string Slug,
    string Description,
    string? LogoUrl,
    string? BannerUrl,
    string? ReturnPolicy,
    string? ShippingPolicy,
    string? ContactEmail,
    decimal AverageRating,
    int ProductCount,
    DateTimeOffset CreatedAt);

public record CreateShopDto(
    string Name,
    string Slug,
    string Description,
    string? ContactEmail);

public record UpdateShopDto(
    string? Name,
    string? Description,
    string? LogoUrl,
    string? BannerUrl,
    string? ReturnPolicy,
    string? ShippingPolicy,
    string? ContactEmail);

// ── Product ───────────────────────────────────────────────────────────────────

public record SellerProductSummaryDto(
    Guid Id,
    Guid ShopId,
    string Title,
    string CategorySlug,
    string Status,
    string Availability,
    int VariantCount,
    long? MinPriceCents,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record SellerProductDto(
    Guid Id,
    Guid ShopId,
    string Title,
    string Description,
    string CategorySlug,
    string Status,
    string Availability,
    string[] Tags,
    IEnumerable<SellerVariantDto> Variants,
    IEnumerable<SellerProductImageDto> Images,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record CreateProductDto(
    string Title,
    string Description,
    string CategorySlug,
    string[]? Tags);

public record UpdateProductDto(
    string? Title,
    string? Description,
    string? CategorySlug,
    string[]? Tags);

public record UpdateProductStatusDto(string Status);

// ── Variant ───────────────────────────────────────────────────────────────────

public record SellerVariantDto(
    Guid Id,
    Guid ProductId,
    string Label,
    string Sku,
    long PriceCents,
    string Currency,
    int Stock,
    Dictionary<string, string> Attributes,
    InventorySnapshotDto? Snapshot);

public record CreateVariantDto(
    string Label,
    string Sku,
    long PriceCents,
    string Currency,
    int Stock,
    Dictionary<string, string>? Attributes,
    int LowStockThreshold = 5);

public record UpdateVariantDto(
    string? Label,
    string? Sku,
    long? PriceCents,
    string? Currency,
    int? Stock,
    Dictionary<string, string>? Attributes);

// ── Product Image ─────────────────────────────────────────────────────────────

public record SellerProductImageDto(Guid Id, Guid MediaId, string AltText, int DisplayOrder);

// ── Inventory Snapshot ────────────────────────────────────────────────────────

public record InventorySnapshotDto(
    Guid VariantId,
    int Stock,
    int LowStockThreshold,
    DateTimeOffset? LastRestockedAt,
    DateTimeOffset UpdatedAt);

public record LowStockItemDto(
    Guid ProductId,
    string ProductTitle,
    Guid VariantId,
    string VariantLabel,
    string Sku,
    int Stock,
    int LowStockThreshold);

// ── Seller Orders ─────────────────────────────────────────────────────────────

public record SellerOrderSummaryDto(
    Guid OrderId,
    string Status,
    string BuyerName,
    long TotalCents,
    DateTimeOffset PlacedAt,
    DateTimeOffset UpdatedAt);

public record SellerOrderDto(
    Guid OrderId,
    Guid SellerId,
    string Status,
    string BuyerName,
    long TotalCents,
    IEnumerable<SellerOrderItemDto> Items,
    DateTimeOffset PlacedAt,
    DateTimeOffset UpdatedAt);

public record SellerOrderItemDto(
    Guid Id,
    Guid ProductId,
    Guid VariantId,
    string ProductTitle,
    string VariantLabel,
    string Sku,
    int Quantity,
    long UnitPriceCents,
    string Currency);

public record UpdateOrderStatusDto(string Status);

// ── Internal ──────────────────────────────────────────────────────────────────

public record SyncOrderDto(
    Guid OrderId,
    Guid SellerId,
    string BuyerName,
    long TotalCents,
    DateTimeOffset PlacedAt,
    IEnumerable<SyncOrderItemDto> Items);

public record SyncOrderItemDto(
    Guid ProductId,
    Guid VariantId,
    string ProductTitle,
    string VariantLabel,
    string Sku,
    int Quantity,
    long UnitPriceCents,
    string Currency);

// ── CSV Import/Export ─────────────────────────────────────────────────────────

public record CsvProductRow(
    string Title,
    string Description,
    string CategorySlug,
    string Tags,
    string Status,
    string VariantLabel,
    string Sku,
    long PriceCents,
    string Currency,
    int Stock,
    int LowStockThreshold);

public record ImportResultDto(int Created, int Skipped, IEnumerable<string> Errors);
