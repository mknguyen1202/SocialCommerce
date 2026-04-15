namespace AdService.Dtos;

public record PagedResult<T>(IEnumerable<T> Items, string? NextCursor, bool HasMore);

// ── Campaign ──────────────────────────────────────────────────────────────────

public record CampaignDto(
    Guid Id,
    Guid ShopId,
    string Name,
    string Status,
    long BudgetCents,
    long SpentCents,
    DateOnly StartDate,
    DateOnly EndDate,
    IEnumerable<Guid> ProductIds,
    CampaignMetricsDto? Metrics,
    DateTimeOffset CreatedAt);

public record CreateCampaignDto(
    string Name,
    long BudgetCents,
    DateOnly StartDate,
    DateOnly EndDate,
    IEnumerable<Guid>? ProductIds);

public record UpdateCampaignDto(
    string? Name,
    long? BudgetCents,
    DateOnly? StartDate,
    DateOnly? EndDate,
    IEnumerable<Guid>? ProductIds);

public record CampaignMetricsDto(
    long Impressions,
    long Clicks,
    long Conversions,
    decimal ClickThroughRate,
    decimal ConversionRate,
    DateTimeOffset UpdatedAt);

// ── Internal ──────────────────────────────────────────────────────────────────

public record RecordImpressionDto(Guid CampaignId);

public record RecordClickDto(Guid CampaignId);
