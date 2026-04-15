using AdService.Data;
using AdService.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace AdService.Controllers;

[ApiController]
[Authorize]
[Route("ads/campaigns")]
public class CampaignsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet]
    public async Task<ActionResult<PagedResult<CampaignDto>>> List(
        [FromQuery] Guid shopId, [FromQuery] string? status,
        [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var query = db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .Where(c => c.ShopId == shopId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        if (cursor != null)
        {
            var ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            var before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(c => c.CreatedAt < before);
        }

        var campaigns = await query
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        var hasMore = campaigns.Count > limit;
        if (hasMore) campaigns.RemoveAt(campaigns.Count - 1);

        string? nextCursor = null;
        if (hasMore && campaigns.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(campaigns[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<CampaignDto>(campaigns.Select(ToDto), nextCursor, hasMore));
    }

    [HttpPost]
    public async Task<ActionResult<CampaignDto>> Create(
        [FromQuery] Guid shopId, [FromBody] CreateCampaignDto dto,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var campaign = new AdCampaign
        {
            ShopId = shopId,
            Name = dto.Name,
            Status = "draft",
            BudgetCents = dto.BudgetCents,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            CreatedAt = now
        };

        if (dto.ProductIds != null)
            foreach (var pid in dto.ProductIds)
                campaign.Products.Add(new CampaignProduct { ProductId = pid });

        db.AdCampaigns.Add(campaign);
        await db.SaveChangesAsync(ct);

        // Auto-create metrics record
        var metrics = new CampaignMetrics { CampaignId = campaign.Id, UpdatedAt = now };
        db.CampaignMetrics.Add(metrics);
        await db.SaveChangesAsync(ct);

        campaign.Metrics = metrics;
        return CreatedAtAction(nameof(Get), new { campaignId = campaign.Id }, ToDto(campaign));
    }

    [HttpGet("{campaignId:guid}")]
    public async Task<ActionResult<CampaignDto>> Get(
        Guid campaignId, CancellationToken ct = default)
    {
        var campaign = await db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);

        return campaign == null ? NotFound() : Ok(ToDto(campaign));
    }

    [HttpPatch("{campaignId:guid}")]
    public async Task<ActionResult<CampaignDto>> Update(
        Guid campaignId, [FromBody] UpdateCampaignDto dto,
        CancellationToken ct = default)
    {
        var campaign = await db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);
        if (campaign == null) return NotFound();

        if (dto.Name != null) campaign.Name = dto.Name;
        if (dto.BudgetCents.HasValue) campaign.BudgetCents = dto.BudgetCents.Value;
        if (dto.StartDate.HasValue) campaign.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue) campaign.EndDate = dto.EndDate.Value;

        if (dto.ProductIds != null)
        {
            // Replace product associations
            db.CampaignProducts.RemoveRange(campaign.Products);
            campaign.Products.Clear();
            foreach (var pid in dto.ProductIds)
                campaign.Products.Add(new CampaignProduct { CampaignId = campaignId, ProductId = pid });
        }

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(campaign));
    }

    [HttpDelete("{campaignId:guid}")]
    public async Task<IActionResult> Delete(
        Guid campaignId, CancellationToken ct = default)
    {
        var campaign = await db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);
        if (campaign == null) return NotFound();

        if (campaign.Metrics != null) db.CampaignMetrics.Remove(campaign.Metrics);
        db.CampaignProducts.RemoveRange(campaign.Products);
        db.AdCampaigns.Remove(campaign);

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{campaignId:guid}/pause")]
    public async Task<ActionResult<CampaignDto>> Pause(
        Guid campaignId, CancellationToken ct = default)
    {
        var campaign = await db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);
        if (campaign == null) return NotFound();

        if (campaign.Status != "active")
            return BadRequest(new { error = "Only active campaigns can be paused." });

        campaign.Status = "paused";
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(campaign));
    }

    [HttpPost("{campaignId:guid}/resume")]
    public async Task<ActionResult<CampaignDto>> Resume(
        Guid campaignId, CancellationToken ct = default)
    {
        var campaign = await db.AdCampaigns
            .Include(c => c.Products)
            .Include(c => c.Metrics)
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);
        if (campaign == null) return NotFound();

        if (campaign.Status != "paused" && campaign.Status != "draft")
            return BadRequest(new { error = "Only paused or draft campaigns can be resumed." });

        campaign.Status = "active";
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(campaign));
    }

    [HttpGet("{campaignId:guid}/metrics")]
    public async Task<ActionResult<CampaignMetricsDto>> GetMetrics(
        Guid campaignId, CancellationToken ct = default)
    {
        var metrics = await db.CampaignMetrics
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId, ct);

        return metrics == null ? NotFound() : Ok(ToMetricsDto(metrics));
    }

    // ── Internal endpoints for FeedService / tracking ─────────────────────────

    [HttpPost("/internal/ads/record-impression")]
    [AllowAnonymous]
    public async Task<IActionResult> RecordImpression(
        [FromBody] RecordImpressionDto dto, CancellationToken ct = default)
    {
        var metrics = await db.CampaignMetrics.FindAsync([dto.CampaignId], ct);
        if (metrics == null) return NotFound();

        metrics.Impressions++;
        metrics.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("/internal/ads/record-click")]
    [AllowAnonymous]
    public async Task<IActionResult> RecordClick(
        [FromBody] RecordClickDto dto, CancellationToken ct = default)
    {
        var metrics = await db.CampaignMetrics.FindAsync([dto.CampaignId], ct);
        if (metrics == null) return NotFound();

        var campaign = await db.AdCampaigns.FindAsync([dto.CampaignId], ct);

        metrics.Clicks++;
        metrics.UpdatedAt = DateTimeOffset.UtcNow;

        // Estimate cost per click and update spent
        if (campaign != null && metrics.Impressions > 0)
        {
            // Simple CPC: budget / expected clicks estimate
            var cpc = Math.Max(1, campaign.BudgetCents / Math.Max(1, metrics.Impressions / 10));
            campaign.SpentCents = Math.Min(campaign.BudgetCents, campaign.SpentCents + cpc);

            // Auto-pause if budget exhausted
            if (campaign.SpentCents >= campaign.BudgetCents && campaign.Status == "active")
                campaign.Status = "ended";
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CampaignDto ToDto(AdCampaign c) => new(
        c.Id, c.ShopId, c.Name, c.Status,
        c.BudgetCents, c.SpentCents,
        c.StartDate, c.EndDate,
        c.Products.Select(p => p.ProductId),
        c.Metrics == null ? null : ToMetricsDto(c.Metrics),
        c.CreatedAt);

    private static CampaignMetricsDto ToMetricsDto(CampaignMetrics m) => new(
        m.Impressions, m.Clicks, m.Conversions,
        m.Impressions > 0 ? Math.Round((decimal)m.Clicks / m.Impressions * 100, 2) : 0,
        m.Clicks > 0 ? Math.Round((decimal)m.Conversions / m.Clicks * 100, 2) : 0,
        m.UpdatedAt);
}
