namespace AnalyticsService.Data;

public class SalesSummary
{
    public Guid ShopId { get; set; }
    public DateOnly Date { get; set; }
    public long Revenue { get; set; }      // cents
    public int OrderCount { get; set; }
    public int UnitsSold { get; set; }
}

public class ProductSalesSummary
{
    public Guid ShopId { get; set; }
    public Guid ProductId { get; set; }
    public DateOnly Date { get; set; }
    public int UnitsSold { get; set; }
    public long Revenue { get; set; }      // cents
}
