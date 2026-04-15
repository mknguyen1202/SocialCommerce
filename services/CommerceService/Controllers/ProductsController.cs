using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CommerceService.Data;
using CommerceService.Dtos;
using System.Security.Claims;
using System.Text;

namespace CommerceService.Controllers;

[ApiController]
[Authorize]
[Route("products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> Browse(
        [FromQuery] string? category, [FromQuery] string? availability,
        [FromQuery] string? sort, [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        IQueryable<Product> query = db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .Where(p => p.Status == "active");

        if (!string.IsNullOrEmpty(category))
            query = query.Where(p => p.Category.Slug == category);

        if (!string.IsNullOrEmpty(availability))
            query = query.Where(p => p.Availability == availability);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(p => p.CreatedAt < before);
        }

        query = sort switch
        {
            "rating"  => query.OrderByDescending(p => p.AverageRating).ThenByDescending(p => p.CreatedAt),
            "reviews" => query.OrderByDescending(p => p.ReviewCount).ThenByDescending(p => p.CreatedAt),
            _         => query.OrderByDescending(p => p.CreatedAt)
        };

        List<Product> products = await query.Take(limit + 1).ToListAsync(ct);
        bool hasMore = products.Count > limit;
        if (hasMore) products.RemoveAt(products.Count - 1);

        string? nextCursor = null;
        if (hasMore && products.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(products[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<ProductSummaryDto>(products.Select(ToSummaryDto), nextCursor, hasMore));
    }

    [HttpGet("{productId:guid}")]
    public async Task<ActionResult<ProductDto>> Get(Guid productId, CancellationToken ct = default)
    {
        Product? product = await db.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == productId, ct);

        return product == null ? NotFound() : Ok(ToDto(product));
    }

    [HttpGet("search")]
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> Search(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required." });

        IQueryable<Product> query = db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .Where(p => p.Status == "active"
                && (EF.Functions.ILike(p.Title, $"%{q}%")
                    || EF.Functions.ILike(p.Description, $"%{q}%")));

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(p => p.CreatedAt < before);
        }

        List<Product> products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = products.Count > limit;
        if (hasMore) products.RemoveAt(products.Count - 1);

        string? nextCursor = null;
        if (hasMore && products.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(products[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<ProductSummaryDto>(products.Select(ToSummaryDto), nextCursor, hasMore));
    }

    [HttpGet("related/{productId:guid}")]
    public async Task<ActionResult<IEnumerable<ProductSummaryDto>>> Related(
        Guid productId, [FromQuery] int limit = 6, CancellationToken ct = default)
    {
        Product? product = await db.Products.FindAsync([productId], ct);
        if (product == null) return NotFound();

        List<Product> related = await db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .Where(p => p.CategoryId == product.CategoryId && p.Id != productId && p.Status == "active")
            .OrderByDescending(p => p.AverageRating)
            .Take(limit)
            .ToListAsync(ct);

        return Ok(related.Select(ToSummaryDto));
    }

    // ── Reviews ───────────────────────────────────────────────────────────────

    [HttpGet("{productId:guid}/reviews")]
    public async Task<ActionResult<PagedResult<ReviewDto>>> GetReviews(
        Guid productId, [FromQuery] string? sort, [FromQuery] string? cursor,
        [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        IQueryable<Review> query = db.Reviews.Where(r => r.ProductId == productId);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(r => r.CreatedAt < before);
        }

        query = sort switch
        {
            "helpful"     => query.OrderByDescending(r => r.HelpfulCount).ThenByDescending(r => r.CreatedAt),
            "rating_high" => query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt),
            "rating_low"  => query.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt),
            _             => query.OrderByDescending(r => r.CreatedAt)
        };

        List<Review> reviews = await query.Take(limit + 1).ToListAsync(ct);
        bool hasMore = reviews.Count > limit;
        if (hasMore) reviews.RemoveAt(reviews.Count - 1);

        string? nextCursor = null;
        if (hasMore && reviews.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(reviews[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<ReviewDto>(reviews.Select(ToReviewDto), nextCursor, hasMore));
    }

    [HttpPost("{productId:guid}/reviews")]
    public async Task<ActionResult<ReviewDto>> CreateReview(
        Guid productId, [FromBody] CreateReviewDto dto, CancellationToken ct = default)
    {
        Product? product = await db.Products.FindAsync([productId], ct);
        if (product == null) return NotFound();

        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { error = "Rating must be between 1 and 5." });

        Review? existing = await db.Reviews
            .FirstOrDefaultAsync(r => r.ProductId == productId && r.AuthorId == UserId, ct);
        if (existing != null)
            return Conflict(new { error = "You have already reviewed this product." });

        Review review = new Review
        {
            ProductId = productId,
            AuthorId = UserId,
            OrderItemId = dto.OrderItemId,
            Rating = dto.Rating,
            Title = dto.Title,
            Body = dto.Body,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Reviews.Add(review);

        // Incrementally update aggregate rating
        product.AverageRating = (product.AverageRating * product.ReviewCount + dto.Rating)
            / (product.ReviewCount + 1);
        product.ReviewCount++;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ToReviewDto(review));
    }

    // ── Projections ───────────────────────────────────────────────────────────

    private static ProductSummaryDto ToSummaryDto(Product p) => new(
        p.Id,
        p.VendorId,
        p.Title,
        p.Category?.Name ?? string.Empty,
        p.AverageRating,
        p.ReviewCount,
        p.Availability,
        p.Status,
        p.Tags,
        p.Variants.Count > 0 ? p.Variants.Min(v => v.PriceCents) : null,
        p.Variants.FirstOrDefault()?.Currency,
        p.CreatedAt);

    private static ProductDto ToDto(Product p) => new(
        p.Id,
        p.VendorId,
        p.Title,
        p.Description,
        p.CategoryId,
        p.Category?.Name ?? string.Empty,
        p.AverageRating,
        p.ReviewCount,
        p.Availability,
        p.Status,
        p.Tags,
        p.Images.Select(i => new ProductImageDto(i.Id, i.MediaId, i.AltText, i.DisplayOrder)),
        p.Variants.Select(v => new ProductVariantDto(v.Id, v.Label, v.Sku, v.PriceCents, v.Currency, v.Stock, v.Attributes)),
        p.CreatedAt,
        p.UpdatedAt);

    private static ReviewDto ToReviewDto(Review r) => new(
        r.Id, r.ProductId, r.AuthorId, r.OrderItemId,
        r.Rating, r.Title, r.Body, r.HelpfulCount, r.CreatedAt, r.UpdatedAt);
}
