using InventoryService.Data;
using InventoryService.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InventoryService.Controllers;

[ApiController]
[Authorize]
public class ShopsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet("shops/mine")]
    public async Task<ActionResult<ShopDto>> GetMine(CancellationToken ct = default)
    {
        var shop = await db.Shops.FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        return shop == null ? NotFound() : Ok(ToDto(shop));
    }

    [HttpPost("shops")]
    public async Task<ActionResult<ShopDto>> Create(
        [FromBody] CreateShopDto dto, CancellationToken ct = default)
    {
        if (await db.Shops.AnyAsync(s => s.OwnerId == UserId, ct))
            return Conflict(new { error = "You already have a shop." });
        if (await db.Shops.AnyAsync(s => s.Slug == dto.Slug, ct))
            return Conflict(new { error = "Slug is already taken." });

        var shop = new Shop
        {
            OwnerId = UserId,
            Name = dto.Name,
            Slug = dto.Slug,
            Description = dto.Description,
            ContactEmail = dto.ContactEmail,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Shops.Add(shop);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetBySlug), new { slug = shop.Slug }, ToDto(shop));
    }

    [HttpPatch("shops/mine")]
    public async Task<ActionResult<ShopDto>> UpdateMine(
        [FromBody] UpdateShopDto dto, CancellationToken ct = default)
    {
        var shop = await db.Shops.FirstOrDefaultAsync(s => s.OwnerId == UserId, ct);
        if (shop == null) return NotFound();

        if (dto.Name != null) shop.Name = dto.Name;
        if (dto.Description != null) shop.Description = dto.Description;
        if (dto.LogoUrl != null) shop.LogoUrl = dto.LogoUrl;
        if (dto.BannerUrl != null) shop.BannerUrl = dto.BannerUrl;
        if (dto.ReturnPolicy != null) shop.ReturnPolicy = dto.ReturnPolicy;
        if (dto.ShippingPolicy != null) shop.ShippingPolicy = dto.ShippingPolicy;
        if (dto.ContactEmail != null) shop.ContactEmail = dto.ContactEmail;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(shop));
    }

    [HttpGet("shops/{slug}")]
    [AllowAnonymous]
    public async Task<ActionResult<ShopDto>> GetBySlug(string slug, CancellationToken ct = default)
    {
        var shop = await db.Shops.FirstOrDefaultAsync(s => s.Slug == slug, ct);
        return shop == null ? NotFound() : Ok(ToDto(shop));
    }

    internal static ShopDto ToDto(Shop s) => new(
        s.Id, s.OwnerId, s.Name, s.Slug, s.Description,
        s.LogoUrl, s.BannerUrl, s.ReturnPolicy, s.ShippingPolicy,
        s.ContactEmail, s.AverageRating, s.ProductCount, s.CreatedAt);
}
