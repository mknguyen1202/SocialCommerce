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
[Route("inventory")]
public class InventoryProductsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    private async Task<Shop?> GetShopAsync(CancellationToken ct) =>
        await db.Shops.AsNoTracking().FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);

    // ── Products ──────────────────────────────────────────────────────────────

    [HttpGet("products")]
    public async Task<ActionResult<PagedResult<SellerProductSummaryDto>>> ListProducts(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound(new { error = "You don't have a shop yet." });

        IQueryable<SellerProduct> query = db.Products
            .Include(p => p.Variants)
            .Where(p => p.ShopId == shop.Id);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status == status);

        if (cursor != null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new DateTimeOffset(ticks, TimeSpan.Zero);
            query = query.Where(p => p.CreatedAt < before);
        }

        List<SellerProduct> products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = products.Count > limit;
        if (hasMore) products.RemoveAt(products.Count - 1);

        string? nextCursor = null;
        if (hasMore && products.Count > 0)
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(products[^1].CreatedAt.UtcTicks.ToString()));

        return Ok(new PagedResult<SellerProductSummaryDto>(
            products.Select(ToSummaryDto), nextCursor, hasMore));
    }

    [HttpPost("products")]
    public async Task<ActionResult<SellerProductDto>> CreateProduct(
        [FromBody] CreateProductDto dto, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound(new { error = "You don't have a shop yet." });

        DateTimeOffset now = DateTimeOffset.UtcNow;
        SellerProduct product = new SellerProduct
        {
            ShopId = shop.Id,
            Title = dto.Title,
            Description = dto.Description,
            CategorySlug = dto.CategorySlug,
            Tags = dto.Tags ?? [],
            Status = "draft",
            Availability = "out_of_stock",
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Products.Add(product);

        // Bump shop product count
        Shop? shopEntity = await db.Shops.FindAsync([shop.Id], ct);
        if (shopEntity != null) shopEntity.ProductCount++;

        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetProduct), new { productId = product.Id }, ToDto(product));
    }

    [HttpGet("products/{productId:guid}")]
    public async Task<ActionResult<SellerProductDto>> GetProduct(
        Guid productId, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerProduct? product = await db.Products
            .Include(p => p.Variants).ThenInclude(v => v.Snapshot)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);

        return product == null ? NotFound() : Ok(ToDto(product));
    }

    [HttpPatch("products/{productId:guid}")]
    public async Task<ActionResult<SellerProductDto>> UpdateProduct(
        Guid productId, [FromBody] UpdateProductDto dto, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerProduct? product = await db.Products
            .Include(p => p.Variants).ThenInclude(v => v.Snapshot)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);
        if (product == null) return NotFound();

        if (dto.Title != null) product.Title = dto.Title;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.CategorySlug != null) product.CategorySlug = dto.CategorySlug;
        if (dto.Tags != null) product.Tags = dto.Tags;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(product));
    }

    [HttpDelete("products/{productId:guid}")]
    public async Task<IActionResult> DeleteProduct(
        Guid productId, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerProduct? product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);
        if (product == null) return NotFound();

        db.Products.Remove(product);

        Shop? shopEntity = await db.Shops.FindAsync([shop.Id], ct);
        if (shopEntity != null && shopEntity.ProductCount > 0) shopEntity.ProductCount--;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("products/{productId:guid}/status")]
    public async Task<ActionResult<SellerProductDto>> UpdateProductStatus(
        Guid productId, [FromBody] UpdateProductStatusDto dto, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        string[] allowed = new[] { "draft", "active", "archived" };
        if (!allowed.Contains(dto.Status))
            return BadRequest(new { error = $"Status must be one of: {string.Join(", ", allowed)}" });

        SellerProduct? product = await db.Products
            .Include(p => p.Variants).ThenInclude(v => v.Snapshot)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);
        if (product == null) return NotFound();

        product.Status = dto.Status;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(product));
    }

    // ── Variants ──────────────────────────────────────────────────────────────

    [HttpGet("products/{productId:guid}/variants")]
    public async Task<ActionResult<IEnumerable<SellerVariantDto>>> ListVariants(
        Guid productId, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerProduct? product = await db.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);
        if (product == null) return NotFound();

        List<SellerVariant> variants = await db.Variants
            .Include(v => v.Snapshot)
            .Where(v => v.ProductId == productId)
            .OrderBy(v => v.Label)
            .ToListAsync(ct);

        return Ok(variants.Select(ToVariantDto));
    }

    [HttpPost("products/{productId:guid}/variants")]
    public async Task<ActionResult<SellerVariantDto>> CreateVariant(
        Guid productId, [FromBody] CreateVariantDto dto, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerProduct? product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.ShopId == shop.Id, ct);
        if (product == null) return NotFound();

        if (await db.Variants.AnyAsync(v => v.Sku == dto.Sku, ct))
            return Conflict(new { error = "SKU already exists." });

        DateTimeOffset now = DateTimeOffset.UtcNow;
        SellerVariant variant = new SellerVariant
        {
            ProductId = productId,
            Label = dto.Label,
            Sku = dto.Sku,
            PriceCents = dto.PriceCents,
            Currency = dto.Currency,
            Stock = dto.Stock,
            Attributes = dto.Attributes ?? []
        };
        db.Variants.Add(variant);

        // Auto-create inventory snapshot
        await db.SaveChangesAsync(ct); // get variant ID

        InventorySnapshot snapshot = new InventorySnapshot
        {
            VariantId = variant.Id,
            Stock = dto.Stock,
            LowStockThreshold = dto.LowStockThreshold,
            LastRestockedAt = dto.Stock > 0 ? now : null,
            UpdatedAt = now
        };
        db.InventorySnapshots.Add(snapshot);

        // Update product availability
        await UpdateProductAvailabilityAsync(productId, ct);

        product.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        variant.Snapshot = snapshot;
        return CreatedAtAction(nameof(ListVariants), new { productId }, ToVariantDto(variant));
    }

    [HttpPatch("variants/{variantId:guid}")]
    public async Task<ActionResult<SellerVariantDto>> UpdateVariant(
        Guid variantId, [FromBody] UpdateVariantDto dto, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerVariant? variant = await db.Variants
            .Include(v => v.Product)
            .Include(v => v.Snapshot)
            .FirstOrDefaultAsync(v => v.Id == variantId && v.Product.ShopId == shop.Id, ct);
        if (variant == null) return NotFound();

        if (dto.Label != null) variant.Label = dto.Label;
        if (dto.Sku != null)
        {
            if (await db.Variants.AnyAsync(v => v.Sku == dto.Sku && v.Id != variantId, ct))
                return Conflict(new { error = "SKU already exists." });
            variant.Sku = dto.Sku;
        }
        if (dto.PriceCents.HasValue) variant.PriceCents = dto.PriceCents.Value;
        if (dto.Currency != null) variant.Currency = dto.Currency;
        if (dto.Stock.HasValue)
        {
            int oldStock = variant.Stock;
            variant.Stock = dto.Stock.Value;
            if (variant.Snapshot != null)
            {
                variant.Snapshot.Stock = dto.Stock.Value;
                variant.Snapshot.UpdatedAt = DateTimeOffset.UtcNow;
                if (dto.Stock.Value > oldStock)
                    variant.Snapshot.LastRestockedAt = DateTimeOffset.UtcNow;
            }
        }
        if (dto.Attributes != null) variant.Attributes = dto.Attributes;

        variant.Product.UpdatedAt = DateTimeOffset.UtcNow;

        await UpdateProductAvailabilityAsync(variant.ProductId, ct);
        await db.SaveChangesAsync(ct);

        return Ok(ToVariantDto(variant));
    }

    [HttpDelete("variants/{variantId:guid}")]
    public async Task<IActionResult> DeleteVariant(
        Guid variantId, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        SellerVariant? variant = await db.Variants
            .Include(v => v.Product)
            .Include(v => v.Snapshot)
            .FirstOrDefaultAsync(v => v.Id == variantId && v.Product.ShopId == shop.Id, ct);
        if (variant == null) return NotFound();

        if (variant.Snapshot != null) db.InventorySnapshots.Remove(variant.Snapshot);
        db.Variants.Remove(variant);

        variant.Product.UpdatedAt = DateTimeOffset.UtcNow;

        await UpdateProductAvailabilityAsync(variant.ProductId, ct);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    // ── Low Stock ─────────────────────────────────────────────────────────────

    [HttpGet("low-stock")]
    public async Task<ActionResult<IEnumerable<LowStockItemDto>>> LowStock(CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound();

        List<LowStockItemDto> items = await db.InventorySnapshots
            .Include(s => s.Variant).ThenInclude(v => v.Product)
            .Where(s => s.Variant.Product.ShopId == shop.Id && s.Stock <= s.LowStockThreshold)
            .OrderBy(s => s.Stock)
            .Select(s => new LowStockItemDto(
                s.Variant.ProductId,
                s.Variant.Product.Title,
                s.VariantId,
                s.Variant.Label,
                s.Variant.Sku,
                s.Stock,
                s.LowStockThreshold))
            .ToListAsync(ct);

        return Ok(items);
    }

    // ── CSV Import / Export ──────────────────────────────────────────────────

    [HttpPost("import")]
    public async Task<ActionResult<ImportResultDto>> Import(
        IFormFile file, CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound(new { error = "You don't have a shop yet." });

        if (file.Length == 0) return BadRequest(new { error = "File is empty." });

        List<string> errors = new List<string>();
        int created = 0, skipped = 0;

        using StreamReader reader = new StreamReader(file.OpenReadStream());
        string? header = await reader.ReadLineAsync(ct);
        if (header == null) return BadRequest(new { error = "Empty CSV file." });

        DateTimeOffset now = DateTimeOffset.UtcNow;
        int line = 1;

        while (await reader.ReadLineAsync(ct) is { } row)
        {
            line++;
            string[] cols = row.Split(',');
            if (cols.Length < 11)
            {
                errors.Add($"Line {line}: expected 11 columns, got {cols.Length}");
                skipped++;
                continue;
            }

            try
            {
                string title = cols[0].Trim();
                string sku = cols[6].Trim();

                if (await db.Variants.AnyAsync(v => v.Sku == sku, ct))
                {
                    errors.Add($"Line {line}: SKU '{sku}' already exists");
                    skipped++;
                    continue;
                }

                SellerProduct product = new SellerProduct
                {
                    ShopId = shop.Id,
                    Title = title,
                    Description = cols[1].Trim(),
                    CategorySlug = cols[2].Trim(),
                    Tags = string.IsNullOrWhiteSpace(cols[3]) ? [] : cols[3].Split('|'),
                    Status = cols[4].Trim(),
                    Availability = "out_of_stock",
                    CreatedAt = now,
                    UpdatedAt = now
                };
                db.Products.Add(product);
                await db.SaveChangesAsync(ct);

                int stock = int.Parse(cols[9].Trim());
                SellerVariant variant = new SellerVariant
                {
                    ProductId = product.Id,
                    Label = cols[5].Trim(),
                    Sku = sku,
                    PriceCents = long.Parse(cols[7].Trim()),
                    Currency = cols[8].Trim(),
                    Stock = stock,
                    Attributes = []
                };
                db.Variants.Add(variant);
                await db.SaveChangesAsync(ct);

                int threshold = int.Parse(cols[10].Trim());
                db.InventorySnapshots.Add(new InventorySnapshot
                {
                    VariantId = variant.Id,
                    Stock = stock,
                    LowStockThreshold = threshold,
                    LastRestockedAt = stock > 0 ? now : null,
                    UpdatedAt = now
                });

                await UpdateProductAvailabilityAsync(product.Id, ct);
                await db.SaveChangesAsync(ct);

                Shop? shopEntity = await db.Shops.FindAsync([shop.Id], ct);
                if (shopEntity != null) shopEntity.ProductCount++;

                created++;
            }
            catch (Exception ex)
            {
                errors.Add($"Line {line}: {ex.Message}");
                skipped++;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new ImportResultDto(created, skipped, errors));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct = default)
    {
        Shop? shop = await GetShopAsync(ct);
        if (shop == null) return NotFound(new { error = "You don't have a shop yet." });

        List<SellerProduct> products = await db.Products
            .Include(p => p.Variants).ThenInclude(v => v.Snapshot)
            .Where(p => p.ShopId == shop.Id)
            .OrderBy(p => p.Title)
            .ToListAsync(ct);

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("Title,Description,CategorySlug,Tags,Status,VariantLabel,Sku,PriceCents,Currency,Stock,LowStockThreshold");

        foreach (SellerProduct product in products)
        {
            string tags = string.Join("|", product.Tags);
            foreach (SellerVariant v in product.Variants)
            {
                var threshold = v.Snapshot?.LowStockThreshold ?? 5;
                sb.AppendLine($"\"{Esc(product.Title)}\",\"{Esc(product.Description)}\",{product.CategorySlug},{tags},{product.Status},{v.Label},{v.Sku},{v.PriceCents},{v.Currency},{v.Stock},{threshold}");
            }
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "inventory-export.csv");
    }

    private static string Esc(string val) => val.Replace("\"", "\"\"");

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task UpdateProductAvailabilityAsync(Guid productId, CancellationToken ct)
    {
        List<SellerVariant> variants = await db.Variants
            .Where(v => v.ProductId == productId)
            .ToListAsync(ct);

        SellerProduct? product = await db.Products.FindAsync([productId], ct);
        if (product == null) return;

        int totalStock = variants.Sum(v => v.Stock);
        product.Availability = totalStock switch
        {
            0 => "out_of_stock",
            <= 5 => "low_stock",
            _ => "in_stock"
        };
    }

    private static SellerProductSummaryDto ToSummaryDto(SellerProduct p) => new(
        p.Id, p.ShopId, p.Title, p.CategorySlug, p.Status, p.Availability,
        p.Variants.Count,
        p.Variants.Count > 0 ? p.Variants.Min(v => v.PriceCents) : null,
        p.CreatedAt, p.UpdatedAt);

    private static SellerProductDto ToDto(SellerProduct p) => new(
        p.Id, p.ShopId, p.Title, p.Description, p.CategorySlug,
        p.Status, p.Availability, p.Tags,
        p.Variants.Select(ToVariantDto),
        p.Images.OrderBy(i => i.DisplayOrder).Select(i =>
            new SellerProductImageDto(i.Id, i.MediaId, i.AltText, i.DisplayOrder)),
        p.CreatedAt, p.UpdatedAt);

    private static SellerVariantDto ToVariantDto(SellerVariant v) => new(
        v.Id, v.ProductId, v.Label, v.Sku, v.PriceCents, v.Currency,
        v.Stock, v.Attributes,
        v.Snapshot == null ? null : new InventorySnapshotDto(
            v.Snapshot.VariantId, v.Snapshot.Stock,
            v.Snapshot.LowStockThreshold, v.Snapshot.LastRestockedAt,
            v.Snapshot.UpdatedAt));
}
