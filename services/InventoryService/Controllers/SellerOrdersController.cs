using InventoryService.Data;
using InventoryService.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace InventoryService.Controllers;

[ApiController]
[Authorize]
public class SellerOrdersController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet("seller/orders")]
    public async Task<ActionResult<PagedResult<SellerOrderSummaryDto>>> ListOrders(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        var shop = await db.Shops.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        if (shop == null) return NotFound(new { error = "You don't have a shop yet." });

        var query = db.SellerOrders
            .Where(o => o.SellerId == shop.Id);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        if (cursor != null)
        {
            var ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            var before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(o => o.PlacedAt < before);
        }

        var orders = await query
            .OrderByDescending(o => o.PlacedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        var hasMore = orders.Count > limit;
        if (hasMore) orders.RemoveAt(orders.Count - 1);

        string? nextCursor = null;
        if (hasMore && orders.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(orders[^1].PlacedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<SellerOrderSummaryDto>(
            orders.Select(o => new SellerOrderSummaryDto(
                o.OrderId, o.Status, o.BuyerName,
                o.TotalCents, o.PlacedAt, o.UpdatedAt)),
            nextCursor, hasMore));
    }

    [HttpGet("seller/orders/{orderId:guid}")]
    public async Task<ActionResult<SellerOrderDto>> GetOrder(
        Guid orderId, CancellationToken ct = default)
    {
        var shop = await db.Shops.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        if (shop == null) return NotFound();

        var order = await db.SellerOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.SellerId == shop.Id, ct);

        return order == null ? NotFound() : Ok(ToDto(order));
    }

    [HttpPatch("seller/orders/{orderId:guid}/status")]
    public async Task<ActionResult<SellerOrderDto>> UpdateOrderStatus(
        Guid orderId, [FromBody] UpdateOrderStatusDto dto, CancellationToken ct = default)
    {
        var shop = await db.Shops.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        if (shop == null) return NotFound();

        var allowed = new[] { "confirmed", "shipped", "delivered" };
        if (!allowed.Contains(dto.Status))
            return BadRequest(new { error = $"Status must be one of: {string.Join(", ", allowed)}" });

        var order = await db.SellerOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.SellerId == shop.Id, ct);
        if (order == null) return NotFound();

        order.Status = dto.Status;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(order));
    }

    [HttpPost("seller/orders/{orderId:guid}/refund")]
    public async Task<ActionResult<SellerOrderDto>> RefundOrder(
        Guid orderId, CancellationToken ct = default)
    {
        var shop = await db.Shops.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        if (shop == null) return NotFound();

        var order = await db.SellerOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.SellerId == shop.Id, ct);
        if (order == null) return NotFound();

        if (order.Status is "refunded" or "cancelled")
            return BadRequest(new { error = "Order is already refunded or cancelled." });

        order.Status = "refunded";
        order.UpdatedAt = DateTimeOffset.UtcNow;

        // Restore stock for each item
        foreach (var item in order.Items)
        {
            var variant = await db.Variants.FindAsync([item.VariantId], ct);
            if (variant != null)
            {
                variant.Stock += item.Quantity;
                var snapshot = await db.InventorySnapshots.FindAsync([variant.Id], ct);
                if (snapshot != null)
                {
                    snapshot.Stock = variant.Stock;
                    snapshot.LastRestockedAt = DateTimeOffset.UtcNow;
                    snapshot.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(order));
    }

    // ── Internal endpoint for OrderService to sync orders ─────────────────────

    [HttpPost("internal/seller-orders/sync")]
    [AllowAnonymous] // protected via API key in production
    public async Task<IActionResult> SyncOrder(
        [FromBody] SyncOrderDto dto, CancellationToken ct = default)
    {
        var existing = await db.SellerOrders.FindAsync([dto.OrderId], ct);
        if (existing != null)
            return Conflict(new { error = "Order already synced." });

        var now = DateTimeOffset.UtcNow;
        var order = new SellerOrder
        {
            OrderId = dto.OrderId,
            SellerId = dto.SellerId,
            Status = "pending",
            BuyerName = dto.BuyerName,
            TotalCents = dto.TotalCents,
            PlacedAt = dto.PlacedAt,
            UpdatedAt = now
        };

        foreach (var item in dto.Items)
        {
            order.Items.Add(new SellerOrderItem
            {
                OrderId = dto.OrderId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                ProductTitle = item.ProductTitle,
                VariantLabel = item.VariantLabel,
                Sku = item.Sku,
                Quantity = item.Quantity,
                UnitPriceCents = item.UnitPriceCents,
                Currency = item.Currency
            });

            // Decrement stock
            var variant = await db.Variants.FindAsync([item.VariantId], ct);
            if (variant != null)
            {
                variant.Stock = Math.Max(0, variant.Stock - item.Quantity);
                var snapshot = await db.InventorySnapshots.FindAsync([variant.Id], ct);
                if (snapshot != null)
                {
                    snapshot.Stock = variant.Stock;
                    snapshot.UpdatedAt = now;
                }
            }
        }

        db.SellerOrders.Add(order);
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    private static SellerOrderDto ToDto(SellerOrder o) => new(
        o.OrderId, o.SellerId, o.Status, o.BuyerName, o.TotalCents,
        o.Items.Select(i => new SellerOrderItemDto(
            i.Id, i.ProductId, i.VariantId, i.ProductTitle,
            i.VariantLabel, i.Sku, i.Quantity, i.UnitPriceCents, i.Currency)),
        o.PlacedAt, o.UpdatedAt);
}
