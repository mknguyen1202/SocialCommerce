using AnalyticsService.Data;
using AnalyticsService.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace AnalyticsService.Controllers;

[ApiController]
[Authorize]
[Route("analytics")]
public class AnalyticsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    /// <summary>
    /// Returns the shopId from the "shop" claim, or looks it up from the UID via query param.
    /// For simplicity, the seller's shopId is passed as a query param or extracted from claims.
    /// </summary>
    private Guid GetShopId()
    {
        var shopClaim = User.FindFirstValue("shop");
        if (shopClaim != null && Guid.TryParse(shopClaim, out var shopId))
            return shopId;

        // Fallback: use the query string
        if (HttpContext.Request.Query.TryGetValue("shopId", out var qs) && Guid.TryParse(qs, out var qsId))
            return qsId;

        throw new InvalidOperationException("shopId is required.");
    }

    [HttpGet("overview")]
    public async Task<ActionResult<OverviewDto>> Overview(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        CancellationToken ct = default)
    {
        var shopId = GetShopId();
        var query = db.SalesSummaries.Where(s => s.ShopId == shopId);

        if (from.HasValue) query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue) query = query.Where(s => s.Date <= to.Value);

        var summaries = await query.ToListAsync(ct);

        var totalRevenue = summaries.Sum(s => s.Revenue);
        var totalOrders = summaries.Sum(s => s.OrderCount);
        var totalUnits = summaries.Sum(s => s.UnitsSold);
        var avgOrderValue = totalOrders > 0 ? (decimal)totalRevenue / totalOrders : 0m;

        return Ok(new OverviewDto(totalRevenue, totalOrders, totalUnits, Math.Round(avgOrderValue, 2)));
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<IEnumerable<RevenuePointDto>>> Revenue(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string granularity = "daily",
        CancellationToken ct = default)
    {
        var shopId = GetShopId();
        var query = db.SalesSummaries.Where(s => s.ShopId == shopId);

        if (from.HasValue) query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue) query = query.Where(s => s.Date <= to.Value);

        var summaries = await query.OrderBy(s => s.Date).ToListAsync(ct);

        var grouped = granularity switch
        {
            "weekly" => summaries
                .GroupBy(s => CultureInfo.InvariantCulture.Calendar
                    .GetWeekOfYear(s.Date.ToDateTime(TimeOnly.MinValue), CalendarWeekRule.FirstDay, DayOfWeek.Monday))
                .Select(g => new RevenuePointDto(
                    $"W{g.Key} {g.First().Date.Year}",
                    g.Sum(s => s.Revenue))),
            "monthly" => summaries
                .GroupBy(s => new { s.Date.Year, s.Date.Month })
                .Select(g => new RevenuePointDto(
                    $"{g.Key.Year}-{g.Key.Month:D2}",
                    g.Sum(s => s.Revenue))),
            _ => summaries
                .Select(s => new RevenuePointDto(s.Date.ToString("yyyy-MM-dd"), s.Revenue))
        };

        return Ok(grouped);
    }

    [HttpGet("top-products")]
    public async Task<ActionResult<IEnumerable<TopProductDto>>> TopProducts(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string sortBy = "revenue", [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var shopId = GetShopId();
        var query = db.ProductSalesSummaries.Where(s => s.ShopId == shopId);

        if (from.HasValue) query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue) query = query.Where(s => s.Date <= to.Value);

        var grouped = await query
            .GroupBy(s => s.ProductId)
            .Select(g => new TopProductDto(
                g.Key,
                g.Sum(s => s.UnitsSold),
                g.Sum(s => s.Revenue)))
            .ToListAsync(ct);

        var sorted = sortBy == "units"
            ? grouped.OrderByDescending(p => p.UnitsSold)
            : grouped.OrderByDescending(p => p.Revenue);

        return Ok(sorted.Take(limit));
    }

    [HttpGet("orders")]
    public async Task<ActionResult<IEnumerable<OrderVolumePointDto>>> OrderVolume(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string granularity = "daily",
        CancellationToken ct = default)
    {
        var shopId = GetShopId();
        var query = db.SalesSummaries.Where(s => s.ShopId == shopId);

        if (from.HasValue) query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue) query = query.Where(s => s.Date <= to.Value);

        var summaries = await query.OrderBy(s => s.Date).ToListAsync(ct);

        var grouped = granularity switch
        {
            "weekly" => summaries
                .GroupBy(s => CultureInfo.InvariantCulture.Calendar
                    .GetWeekOfYear(s.Date.ToDateTime(TimeOnly.MinValue), CalendarWeekRule.FirstDay, DayOfWeek.Monday))
                .Select(g => new OrderVolumePointDto(
                    $"W{g.Key} {g.First().Date.Year}",
                    g.Sum(s => s.OrderCount))),
            "monthly" => summaries
                .GroupBy(s => new { s.Date.Year, s.Date.Month })
                .Select(g => new OrderVolumePointDto(
                    $"{g.Key.Year}-{g.Key.Month:D2}",
                    g.Sum(s => s.OrderCount))),
            _ => summaries
                .Select(s => new OrderVolumePointDto(s.Date.ToString("yyyy-MM-dd"), s.OrderCount))
        };

        return Ok(grouped);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        CancellationToken ct = default)
    {
        var shopId = GetShopId();
        var query = db.SalesSummaries
            .Where(s => s.ShopId == shopId);

        if (from.HasValue) query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue) query = query.Where(s => s.Date <= to.Value);

        var summaries = await query.OrderBy(s => s.Date).ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("Date,Revenue,OrderCount,UnitsSold");
        foreach (var s in summaries)
            sb.AppendLine($"{s.Date:yyyy-MM-dd},{s.Revenue},{s.OrderCount},{s.UnitsSold}");

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "analytics-export.csv");
    }

    // ── Internal endpoint for ingesting order events via HTTP ──────────────────

    [HttpPost("/internal/analytics/order-placed")]
    [AllowAnonymous]
    public async Task<IActionResult> IngestOrder(
        [FromBody] OrderPlacedEvent evt, CancellationToken ct = default)
    {
        var date = DateOnly.FromDateTime(evt.PlacedAt.UtcDateTime);
        var unitsSold = evt.Items.Sum(i => i.Quantity);

        var summary = await db.SalesSummaries
            .FirstOrDefaultAsync(s => s.ShopId == evt.ShopId && s.Date == date, ct);

        if (summary == null)
        {
            summary = new SalesSummary
            {
                ShopId = evt.ShopId,
                Date = date,
                Revenue = evt.TotalCents,
                OrderCount = 1,
                UnitsSold = unitsSold
            };
            db.SalesSummaries.Add(summary);
        }
        else
        {
            summary.Revenue += evt.TotalCents;
            summary.OrderCount++;
            summary.UnitsSold += unitsSold;
        }

        foreach (var item in evt.Items)
        {
            var ps = await db.ProductSalesSummaries
                .FirstOrDefaultAsync(p =>
                    p.ShopId == evt.ShopId &&
                    p.ProductId == item.ProductId &&
                    p.Date == date, ct);

            if (ps == null)
            {
                ps = new ProductSalesSummary
                {
                    ShopId = evt.ShopId,
                    ProductId = item.ProductId,
                    Date = date,
                    UnitsSold = item.Quantity,
                    Revenue = item.UnitPriceCents * item.Quantity
                };
                db.ProductSalesSummaries.Add(ps);
            }
            else
            {
                ps.UnitsSold += item.Quantity;
                ps.Revenue += item.UnitPriceCents * item.Quantity;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }
}
