using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CommerceService.Data;
using CommerceService.Dtos;
using System.Security.Claims;

namespace CommerceService.Controllers;

[ApiController]
[Authorize]
[Route("cart")]
public class CartController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet]
    public async Task<ActionResult<CartDto>> GetCart(CancellationToken ct = default)
    {
        Cart cart = await GetOrCreateCartAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(
        [FromBody] AddCartItemDto dto, CancellationToken ct = default)
    {
        ProductVariant? variant = await db.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == dto.VariantId && v.ProductId == dto.ProductId, ct);
        if (variant == null) return NotFound(new { error = "Product variant not found." });
        if (variant.Stock < dto.Quantity)
            return Conflict(new { error = "Insufficient stock." });

        Cart cart = await GetOrCreateCartAsync(ct);

        CartItem? existing = await db.CartItems
            .FirstOrDefaultAsync(i => i.CartId == cart.Id && i.VariantId == dto.VariantId, ct);

        if (existing != null)
            existing.Quantity += dto.Quantity;
        else
            db.CartItems.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = dto.ProductId,
                VariantId = dto.VariantId,
                Quantity = dto.Quantity,
                AddedAt = DateTimeOffset.UtcNow
            });

        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    [HttpPatch("items/{itemId:guid}")]
    public async Task<ActionResult<CartDto>> UpdateItem(
        Guid itemId, [FromBody] UpdateCartItemDto dto, CancellationToken ct = default)
    {
        Cart? cart = await db.Carts.FirstOrDefaultAsync(c => c.UserId == UserId, ct);
        if (cart == null) return NotFound();

        CartItem? item = await db.CartItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CartId == cart.Id, ct);
        if (item == null) return NotFound();

        if (dto.Quantity <= 0)
            db.CartItems.Remove(item);
        else
            item.Quantity = dto.Quantity;

        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<ActionResult<CartDto>> RemoveItem(
        Guid itemId, CancellationToken ct = default)
    {
        Cart? cart = await db.Carts.FirstOrDefaultAsync(c => c.UserId == UserId, ct);
        if (cart == null) return NotFound();

        CartItem? item = await db.CartItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CartId == cart.Id, ct);
        if (item == null) return NotFound();

        db.CartItems.Remove(item);
        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    [HttpPost("coupon")]
    public async Task<ActionResult<CartDto>> ApplyCoupon(
        [FromBody] ApplyCouponDto dto, CancellationToken ct = default)
    {
        Coupon? coupon = await db.Coupons
            .FirstOrDefaultAsync(c => c.Code == dto.Code && c.IsActive, ct);
        if (coupon == null)
            return BadRequest(new { error = "Invalid or inactive coupon code." });

        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < DateTimeOffset.UtcNow)
            return BadRequest(new { error = "Coupon has expired." });

        if (coupon.MaxUses.HasValue && coupon.UsedCount >= coupon.MaxUses.Value)
            return BadRequest(new { error = "Coupon has reached its maximum uses." });

        Cart cart = await GetOrCreateCartAsync(ct);
        cart.CouponCode = dto.Code;
        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    [HttpDelete("coupon")]
    public async Task<ActionResult<CartDto>> RemoveCoupon(CancellationToken ct = default)
    {
        Cart? cart = await db.Carts.FirstOrDefaultAsync(c => c.UserId == UserId, ct);
        if (cart == null) return NotFound();

        cart.CouponCode = null;
        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await ToCartDtoAsync(cart, ct));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Cart> GetOrCreateCartAsync(CancellationToken ct)
    {
        Cart? cart = await db.Carts.FirstOrDefaultAsync(c => c.UserId == UserId, ct);
        if (cart == null)
        {
            cart = new Cart
            {
                UserId = UserId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Carts.Add(cart);
            await db.SaveChangesAsync(ct);
        }
        return cart;
    }

    private async Task<CartDto> ToCartDtoAsync(Cart cart, CancellationToken ct)
    {
        List<CartItem> items = await db.CartItems
            .Include(i => i.Product)
            .Include(i => i.Variant)
            .Where(i => i.CartId == cart.Id)
            .ToListAsync(ct);

        Coupon? coupon = null;
        if (cart.CouponCode != null)
            coupon = await db.Coupons.FindAsync([cart.CouponCode], ct);

        long subtotal = items.Sum(i => i.Variant.PriceCents * i.Quantity);
        long discount = 0;
        if (coupon != null && (coupon.MinOrderCents == null || subtotal >= coupon.MinOrderCents))
        {
            discount = coupon.DiscountType == "percent"
                ? (long)(subtotal * coupon.DiscountValue / 100m)
                : (long)(coupon.DiscountValue * 100m);
            discount = Math.Min(discount, subtotal);
        }

        return new CartDto(
            cart.Id,
            cart.UserId,
            cart.CouponCode,
            items.Select(i => new CartItemDto(
                i.Id, i.ProductId, i.Product.Title,
                i.VariantId, i.Variant.Label, i.Variant.Sku,
                i.Variant.PriceCents, i.Variant.Currency,
                i.Quantity, i.AddedAt)),
            subtotal,
            discount,
            subtotal - discount,
            cart.UpdatedAt);
    }
}
