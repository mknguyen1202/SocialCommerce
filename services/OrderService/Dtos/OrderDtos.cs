namespace OrderService.Dtos;

// ── Address ───────────────────────────────────────────────────────────────────

public record AddressDto(
    Guid Id,
    string Line1,
    string? Line2,
    string City,
    string State,
    string PostalCode,
    string Country,
    bool IsDefault);

public record CreateAddressDto(
    string Line1,
    string? Line2,
    string City,
    string State,
    string PostalCode,
    string Country,
    bool IsDefault = false);

public record UpdateAddressDto(
    string? Line1,
    string? Line2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    bool? IsDefault);

// ── Checkout ──────────────────────────────────────────────────────────────────

public record CreateCheckoutSessionDto(
    IEnumerable<CheckoutLineItemDto> Items,
    string? CouponCode,
    long DiscountCents,
    string Currency = "USD");

public record CheckoutLineItemDto(
    Guid ProductId,
    Guid VariantId,
    Guid VendorId,
    string ProductTitle,
    string VariantLabel,
    string Sku,
    int Quantity,
    long UnitPriceCents,
    string Currency);

public record SetAddressDto(Guid AddressId);

public record SetPaymentDto(string PaymentMethodToken);

public record CheckoutSessionDto(
    Guid Id,
    Guid UserId,
    string Status,
    AddressDto? ShippingAddress,
    string? CouponCode,
    IEnumerable<CheckoutSessionItemDto> Items,
    long SubtotalCents,
    long DiscountCents,
    long ShippingCents,
    long TaxCents,
    long TotalCents,
    string Currency,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public record CheckoutSessionItemDto(
    Guid Id,
    Guid ProductId,
    Guid VariantId,
    Guid VendorId,
    string ProductTitle,
    string VariantLabel,
    string Sku,
    int Quantity,
    long UnitPriceCents,
    string Currency);

// ── Orders ────────────────────────────────────────────────────────────────────

public record OrderDto(
    Guid Id,
    Guid BuyerId,
    string Status,
    AddressDto ShippingAddress,
    string? PaymentRef,
    IEnumerable<OrderItemDto> Items,
    long SubtotalCents,
    long ShippingCents,
    long TaxCents,
    long TotalCents,
    string Currency,
    string? CouponCode,
    long DiscountCents,
    DateTimeOffset PlacedAt,
    DateTimeOffset UpdatedAt);

public record OrderItemDto(
    Guid Id,
    Guid ProductId,
    Guid VariantId,
    Guid VendorId,
    string ProductTitle,
    string VariantLabel,
    string Sku,
    int Quantity,
    long UnitPriceCents,
    string Currency);

public record OrderSummaryDto(
    Guid Id,
    string Status,
    int ItemCount,
    long TotalCents,
    string Currency,
    DateTimeOffset PlacedAt);

// ── Shipment ──────────────────────────────────────────────────────────────────

public record ShipmentDto(
    Guid Id,
    Guid OrderId,
    string Carrier,
    string TrackingNumber,
    string Status,
    DateOnly? EstimatedDelivery,
    DateTimeOffset? ShippedAt,
    DateTimeOffset? DeliveredAt);

// ── Shared ────────────────────────────────────────────────────────────────────

public record PagedResult<T>(
    IEnumerable<T> Items,
    string? NextCursor,
    bool HasMore);
