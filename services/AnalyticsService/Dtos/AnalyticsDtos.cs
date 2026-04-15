namespace AnalyticsService.Dtos;

public record OverviewDto(
    long TotalRevenue,
    int TotalOrders,
    int TotalUnitsSold,
    decimal AverageOrderValue);

public record RevenuePointDto(string Period, long Revenue);

public record TopProductDto(
    Guid ProductId,
    int UnitsSold,
    long Revenue);

public record OrderVolumePointDto(string Period, int OrderCount);

// ── Internal event from OrderService ──────────────────────────────────────────

public record OrderPlacedEvent(
    Guid OrderId,
    Guid ShopId,
    long TotalCents,
    DateTimeOffset PlacedAt,
    IEnumerable<OrderItemEvent> Items);

public record OrderItemEvent(
    Guid ProductId,
    int Quantity,
    long UnitPriceCents);
