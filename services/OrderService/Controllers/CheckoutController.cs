using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Dtos;
using System.Security.Claims;

namespace OrderService.Controllers;

[ApiController]
[Authorize]
[Route("checkout")]
public class CheckoutController(AppDbContext db) : ControllerBase
{
    // Flat rates used until shipping/tax engines are introduced in a later phase
    private const long ShippingCents = 500L;   // $5.00
    private const decimal TaxRate = 0.08m;     // 8%

    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // ── POST /checkout/session ────────────────────────────────────────────────

    [HttpPost("session")]
    public async Task<ActionResult<CheckoutSessionDto>> CreateSession(
        [FromBody] CreateCheckoutSessionDto dto, CancellationToken ct = default)
    {
        if (!dto.Items.Any())
            return BadRequest(new { error = "At least one item is required." });

        long subtotal = dto.Items.Sum(i => i.UnitPriceCents * i.Quantity);
        long discount = dto.DiscountCents;
        long taxable = Math.Max(0, subtotal - discount) + ShippingCents;
        long tax = (long)Math.Round(taxable * TaxRate, MidpointRounding.AwayFromZero);
        long total = subtotal - discount + ShippingCents + tax;

        CheckoutSession session = new CheckoutSession
        {
            UserId = UserId,
            Status = "pending",
            CouponCode = dto.CouponCode,
            SubtotalCents = subtotal,
            DiscountCents = discount,
            ShippingCents = ShippingCents,
            TaxCents = tax,
            TotalCents = total,
            Currency = dto.Currency,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.CheckoutSessions.Add(session);

        foreach (CheckoutLineItemDto line in dto.Items)
            db.CheckoutSessionItems.Add(new CheckoutSessionItem
            {
                SessionId = session.Id,
                ProductId = line.ProductId,
                VariantId = line.VariantId,
                VendorId = line.VendorId,
                ProductTitle = line.ProductTitle,
                VariantLabel = line.VariantLabel,
                Sku = line.Sku,
                Quantity = line.Quantity,
                UnitPriceCents = line.UnitPriceCents,
                Currency = line.Currency
            });

        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Review), new { sessionId = session.Id }, await ToSessionDtoAsync(session, ct));
    }

    // ── PUT /checkout/session/{sessionId}/address ─────────────────────────────

    [HttpPut("session/{sessionId:guid}/address")]
    public async Task<ActionResult<CheckoutSessionDto>> SetAddress(
        Guid sessionId, [FromBody] SetAddressDto dto, CancellationToken ct = default)
    {
        CheckoutSession? session = await LoadSessionAsync(sessionId, ct);
        if (session == null) return NotFound();
        if (session.UserId != UserId) return Forbid();
        if (session.Status == "placed" || session.Status == "expired")
            return Conflict(new { error = "Session is no longer active." });

        Address? address = await db.Addresses
            .FirstOrDefaultAsync(a => a.Id == dto.AddressId && a.UserId == UserId, ct);
        if (address == null) return NotFound(new { error = "Address not found." });

        session.ShippingAddressId = dto.AddressId;
        if (session.Status == "pending") session.Status = "address_set";
        await db.SaveChangesAsync(ct);
        return Ok(await ToSessionDtoAsync(session, ct));
    }

    // ── PUT /checkout/session/{sessionId}/payment ─────────────────────────────

    [HttpPut("session/{sessionId:guid}/payment")]
    public async Task<ActionResult<CheckoutSessionDto>> SetPayment(
        Guid sessionId, [FromBody] SetPaymentDto dto, CancellationToken ct = default)
    {
        CheckoutSession? session = await LoadSessionAsync(sessionId, ct);
        if (session == null) return NotFound();
        if (session.UserId != UserId) return Forbid();
        if (session.Status == "placed" || session.Status == "expired")
            return Conflict(new { error = "Session is no longer active." });
        if (session.ShippingAddressId == null)
            return Conflict(new { error = "A shipping address must be set before adding payment." });

        session.PaymentMethodToken = dto.PaymentMethodToken;
        session.Status = "payment_set";
        await db.SaveChangesAsync(ct);
        return Ok(await ToSessionDtoAsync(session, ct));
    }

    // ── GET /checkout/session/{sessionId}/review ──────────────────────────────

    [HttpGet("session/{sessionId:guid}/review")]
    public async Task<ActionResult<CheckoutSessionDto>> Review(
        Guid sessionId, CancellationToken ct = default)
    {
        CheckoutSession? session = await LoadSessionAsync(sessionId, ct);
        if (session == null) return NotFound();
        if (session.UserId != UserId) return Forbid();
        return Ok(await ToSessionDtoAsync(session, ct));
    }

    // ── POST /checkout/session/{sessionId}/place ──────────────────────────────

    [HttpPost("session/{sessionId:guid}/place")]
    public async Task<ActionResult<OrderDto>> PlaceOrder(
        Guid sessionId, CancellationToken ct = default)
    {
        CheckoutSession? session = await LoadSessionAsync(sessionId, ct);
        if (session == null) return NotFound();
        if (session.UserId != UserId) return Forbid();

        if (session.Status != "payment_set")
            return Conflict(new { error = "Session must have an address and payment method before placing an order." });
        if (session.ShippingAddressId == null)
            return Conflict(new { error = "Shipping address is required." });
        if (DateTimeOffset.UtcNow > session.ExpiresAt)
        {
            session.Status = "expired";
            await db.SaveChangesAsync(ct);
            return Conflict(new { error = "Checkout session has expired. Please start a new session." });
        }

        // In production: call payment provider to capture/confirm the payment intent here.
        // On failure: return 402 Payment Required with provider error details.
        string paymentRef = $"pay_{Guid.NewGuid():N}";  // placeholder — replace with Stripe confirmation

        Address? address = await db.Addresses.FindAsync([session.ShippingAddressId.Value], ct);
        if (address == null) return NotFound(new { error = "Shipping address not found." });

        Order order = new Order
        {
            BuyerId = UserId,
            Status = "pending",
            ShippingAddressId = session.ShippingAddressId.Value,
            PaymentRef = paymentRef,
            SubtotalCents = session.SubtotalCents,
            ShippingCents = session.ShippingCents,
            TaxCents = session.TaxCents,
            TotalCents = session.TotalCents,
            Currency = session.Currency,
            CouponCode = session.CouponCode,
            DiscountCents = session.DiscountCents,
            PlacedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Orders.Add(order);

        foreach (CheckoutSessionItem line in session.Items)
            db.OrderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                ProductId = line.ProductId,
                VariantId = line.VariantId,
                VendorId = line.VendorId,
                ProductTitle = line.ProductTitle,
                VariantLabel = line.VariantLabel,
                Sku = line.Sku,
                Quantity = line.Quantity,
                UnitPriceCents = line.UnitPriceCents,
                Currency = line.Currency
            });

        session.Status = "placed";
        await db.SaveChangesAsync(ct);

        Order fullOrder = await db.Orders
            .Include(o => o.ShippingAddress)
            .Include(o => o.Items)
            .Include(o => o.Shipments)
            .FirstAsync(o => o.Id == order.Id, ct);

        return Ok(ToOrderDto(fullOrder));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<CheckoutSession?> LoadSessionAsync(Guid sessionId, CancellationToken ct) =>
        await db.CheckoutSessions
            .Include(s => s.Items)
            .Include(s => s.ShippingAddress)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

    private async Task<CheckoutSessionDto> ToSessionDtoAsync(CheckoutSession s, CancellationToken ct)
    {
        Address? address = s.ShippingAddress;
        if (address == null && s.ShippingAddressId.HasValue)
            address = await db.Addresses.FindAsync([s.ShippingAddressId.Value], ct);

        return new CheckoutSessionDto(
            s.Id,
            s.UserId,
            s.Status,
            address == null ? null : ToAddressDto(address),
            s.CouponCode,
            s.Items.Select(ToSessionItemDto),
            s.SubtotalCents,
            s.DiscountCents,
            s.ShippingCents,
            s.TaxCents,
            s.TotalCents,
            s.Currency,
            s.ExpiresAt,
            s.CreatedAt);
    }

    internal static OrderDto ToOrderDto(Order o) => new(
        o.Id,
        o.BuyerId,
        o.Status,
        ToAddressDto(o.ShippingAddress),
        o.PaymentRef,
        o.Items.Select(i => new OrderItemDto(
            i.Id, i.ProductId, i.VariantId, i.VendorId,
            i.ProductTitle, i.VariantLabel, i.Sku,
            i.Quantity, i.UnitPriceCents, i.Currency)),
        o.SubtotalCents,
        o.ShippingCents,
        o.TaxCents,
        o.TotalCents,
        o.Currency,
        o.CouponCode,
        o.DiscountCents,
        o.PlacedAt,
        o.UpdatedAt);

    internal static AddressDto ToAddressDto(Address a) => new(
        a.Id, a.Line1, a.Line2, a.City, a.State, a.PostalCode, a.Country, a.IsDefault);

    private static CheckoutSessionItemDto ToSessionItemDto(CheckoutSessionItem i) => new(
        i.Id, i.ProductId, i.VariantId, i.VendorId,
        i.ProductTitle, i.VariantLabel, i.Sku,
        i.Quantity, i.UnitPriceCents, i.Currency);
}
