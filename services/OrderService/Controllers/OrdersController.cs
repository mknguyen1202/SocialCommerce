using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Dtos;
using System.Security.Claims;
using System.Text;

namespace OrderService.Controllers;

[ApiController]
[Authorize]
[Route("orders")]
public class OrdersController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet]
    public async Task<ActionResult<PagedResult<OrderSummaryDto>>> List(
        [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        IQueryable<Order> query = db.Orders.Where(o => o.BuyerId == UserId);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(o => o.PlacedAt < before);
        }

        List<Order> orders = await query
            .Include(o => o.Items)
            .OrderByDescending(o => o.PlacedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = orders.Count > limit;
        if (hasMore) orders.RemoveAt(orders.Count - 1);

        string? nextCursor = null;
        if (hasMore && orders.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(orders[^1].PlacedAt.UtcTicks.ToString()));

        IEnumerable<OrderSummaryDto> summaries = orders.Select(o => new OrderSummaryDto(
            o.Id,
            o.Status,
            o.Items.Sum(i => i.Quantity),
            o.TotalCents,
            o.Currency,
            o.PlacedAt));

        return Ok(new PagedResult<OrderSummaryDto>(summaries, nextCursor, hasMore));
    }

    [HttpGet("{orderId:guid}")]
    public async Task<ActionResult<OrderDto>> Get(Guid orderId, CancellationToken ct = default)
    {
        Order? order = await db.Orders
            .Include(o => o.ShippingAddress)
            .Include(o => o.Items)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.BuyerId == UserId, ct);

        return order == null ? NotFound() : Ok(CheckoutController.ToOrderDto(order));
    }

    [HttpGet("{orderId:guid}/tracking")]
    public async Task<ActionResult<IEnumerable<ShipmentDto>>> GetTracking(
        Guid orderId, CancellationToken ct = default)
    {
        bool exists = await db.Orders
            .AnyAsync(o => o.Id == orderId && o.BuyerId == UserId, ct);
        if (!exists) return NotFound();

        List<Shipment> shipments = await db.Shipments
            .Where(s => s.OrderId == orderId)
            .ToListAsync(ct);

        return Ok(shipments.Select(ToShipmentDto));
    }

    [HttpPost("{orderId:guid}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(Guid orderId, CancellationToken ct = default)
    {
        Order? order = await db.Orders
            .Include(o => o.ShippingAddress)
            .Include(o => o.Items)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.BuyerId == UserId, ct);
        if (order == null) return NotFound();

        if (order.Status != "pending")
            return Conflict(new { error = "Only pending orders can be cancelled." });

        order.Status = "cancelled";
        order.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(CheckoutController.ToOrderDto(order));
    }

    private static ShipmentDto ToShipmentDto(Shipment s) => new(
        s.Id, s.OrderId, s.Carrier, s.TrackingNumber, s.Status,
        s.EstimatedDelivery, s.ShippedAt, s.DeliveredAt);
}
