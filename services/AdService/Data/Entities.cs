namespace AdService.Data;

public class AdCampaign
{
    public Guid Id { get; set; }
    public Guid ShopId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";  // draft|active|paused|ended
    public long BudgetCents { get; set; }
    public long SpentCents { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<CampaignProduct> Products { get; set; } = [];
    public CampaignMetrics? Metrics { get; set; }
}

public class CampaignProduct
{
    public Guid CampaignId { get; set; }
    public Guid ProductId { get; set; }

    public AdCampaign Campaign { get; set; } = null!;
}

public class CampaignMetrics
{
    public Guid CampaignId { get; set; }
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public long Conversions { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public AdCampaign Campaign { get; set; } = null!;
}
