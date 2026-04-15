using AnalyticsService.Data;
using AnalyticsService.Dtos;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Text.Json;

namespace AnalyticsService.Services;

public sealed class OrderEventSubscriber(
    IServiceScopeFactory scopeFactory,
    IConnectionMultiplexer redis,
    ILogger<OrderEventSubscriber> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var subscriber = redis.GetSubscriber();
        await subscriber.SubscribeAsync(
            RedisChannel.Literal("evt:order:placed"),
            async (_, message) =>
            {
                try
                {
                    var evt = JsonSerializer.Deserialize<OrderPlacedEvent>(message!,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (evt == null) return;

                    await ProcessOrderAsync(evt);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to process order event");
                }
            });

        // Keep running until cancellation
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task ProcessOrderAsync(OrderPlacedEvent evt)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var date = DateOnly.FromDateTime(evt.PlacedAt.UtcDateTime);
        var unitsSold = evt.Items.Sum(i => i.Quantity);

        // Upsert daily sales summary
        var summary = await db.SalesSummaries
            .FirstOrDefaultAsync(s => s.ShopId == evt.ShopId && s.Date == date);

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

        // Upsert per-product summaries
        foreach (var item in evt.Items)
        {
            var ps = await db.ProductSalesSummaries
                .FirstOrDefaultAsync(p =>
                    p.ShopId == evt.ShopId &&
                    p.ProductId == item.ProductId &&
                    p.Date == date);

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

        await db.SaveChangesAsync();
    }
}
