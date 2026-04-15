using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SearchService.Data;
using SearchService.Dtos;

namespace SearchService.Controllers;

/// <summary>
/// Internal API for domain services to maintain the search index.
/// Protected by JWT service-to-service authentication.
/// </summary>
[ApiController]
[Authorize]
[Route("internal/search")]
public class InternalSearchController(AppDbContext db) : ControllerBase
{
    /// <summary>Upsert a search entry. Creates or updates by (EntityType, EntityId).</summary>
    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertSearchEntryDto dto, CancellationToken ct = default)
    {
        SearchEntry? existing = await db.SearchEntries
            .FirstOrDefaultAsync(e => e.EntityType == dto.EntityType && e.EntityId == dto.EntityId, ct);

        if (existing is not null)
        {
            existing.Title = dto.Title;
            existing.Body = dto.Body;
            existing.DomainData = dto.DomainData;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            SearchEntry entry = new()
            {
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                Title = dto.Title,
                Body = dto.Body,
                DomainData = dto.DomainData,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.SearchEntries.Add(entry);
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    /// <summary>Delete a search entry by (EntityType, EntityId).</summary>
    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteSearchEntryDto dto, CancellationToken ct = default)
    {
        int deleted = await db.SearchEntries
            .Where(e => e.EntityType == dto.EntityType && e.EntityId == dto.EntityId)
            .ExecuteDeleteAsync(ct);

        return deleted > 0 ? Ok() : NotFound();
    }
}
