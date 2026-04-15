using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CommerceService.Data;
using CommerceService.Dtos;

namespace CommerceService.Controllers;

[ApiController]
[Authorize]
[Route("categories")]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetTree(CancellationToken ct = default)
    {
        List<Category> all = await db.Categories
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        List<CategoryDto> roots = all
            .Where(c => c.ParentId == null)
            .Select(c => BuildDto(c, all))
            .ToList();

        return Ok(roots);
    }

    private static CategoryDto BuildDto(Category cat, List<Category> all) => new(
        cat.Id,
        cat.Name,
        cat.Slug,
        cat.ParentId,
        cat.DisplayOrder,
        all.Where(c => c.ParentId == cat.Id)
           .Select(c => BuildDto(c, all))
           .ToList());
}
