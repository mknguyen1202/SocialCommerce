using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Dtos;
using System.Security.Claims;

namespace OrderService.Controllers;

[ApiController]
[Authorize]
[Route("addresses")]
public class AddressesController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AddressDto>>> List(CancellationToken ct = default)
    {
        List<Address> addresses = await db.Addresses
            .Where(a => a.UserId == UserId)
            .OrderByDescending(a => a.IsDefault)
            .ToListAsync(ct);

        return Ok(addresses.Select(CheckoutController.ToAddressDto));
    }

    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create(
        [FromBody] CreateAddressDto dto, CancellationToken ct = default)
    {
        if (dto.IsDefault)
            await ClearDefaultAsync(ct);

        Address address = new Address
        {
            UserId = UserId,
            Line1 = dto.Line1,
            Line2 = dto.Line2,
            City = dto.City,
            State = dto.State,
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            IsDefault = dto.IsDefault
        };
        db.Addresses.Add(address);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(List), CheckoutController.ToAddressDto(address));
    }

    [HttpPatch("{addressId:guid}")]
    public async Task<ActionResult<AddressDto>> Update(
        Guid addressId, [FromBody] UpdateAddressDto dto, CancellationToken ct = default)
    {
        Address? address = await db.Addresses
            .FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == UserId, ct);
        if (address == null) return NotFound();

        if (dto.Line1 != null) address.Line1 = dto.Line1;
        if (dto.Line2 != null) address.Line2 = dto.Line2;
        if (dto.City != null) address.City = dto.City;
        if (dto.State != null) address.State = dto.State;
        if (dto.PostalCode != null) address.PostalCode = dto.PostalCode;
        if (dto.Country != null) address.Country = dto.Country;

        if (dto.IsDefault == true)
        {
            await ClearDefaultAsync(ct);
            address.IsDefault = true;
        }

        await db.SaveChangesAsync(ct);
        return Ok(CheckoutController.ToAddressDto(address));
    }

    [HttpDelete("{addressId:guid}")]
    public async Task<IActionResult> Delete(Guid addressId, CancellationToken ct = default)
    {
        Address? address = await db.Addresses
            .FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == UserId, ct);
        if (address == null) return NotFound();

        db.Addresses.Remove(address);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ClearDefaultAsync(CancellationToken ct)
    {
        Address? current = await db.Addresses
            .FirstOrDefaultAsync(a => a.UserId == UserId && a.IsDefault, ct);
        if (current != null) current.IsDefault = false;
    }
}
