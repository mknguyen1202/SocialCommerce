using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SearchService.Data;
using SearchService.Dtos;
using System.Text;

namespace SearchService.Controllers;

[ApiController]
[Authorize]
[Route("search")]
public class SearchController(AppDbContext db) : ControllerBase
{
    /// <summary>Unified search across all entity types.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<SearchResultDto>>> Search(
        [FromQuery] string q,
        [FromQuery] string? type,
        [FromQuery] string? cursor,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        return await ExecuteSearch(q, type, cursor, limit, ct);
    }

    [HttpGet("users")]
    public Task<ActionResult<PagedResult<SearchResultDto>>> SearchUsers(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
        => ExecuteSearch(q, "user", cursor, limit, ct);

    [HttpGet("posts")]
    public Task<ActionResult<PagedResult<SearchResultDto>>> SearchPosts(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
        => ExecuteSearch(q, "post", cursor, limit, ct);

    [HttpGet("groups")]
    public Task<ActionResult<PagedResult<SearchResultDto>>> SearchGroups(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
        => ExecuteSearch(q, "group", cursor, limit, ct);

    [HttpGet("theaters")]
    public Task<ActionResult<PagedResult<SearchResultDto>>> SearchTheaters(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
        => ExecuteSearch(q, "theater", cursor, limit, ct);

    [HttpGet("products")]
    public Task<ActionResult<PagedResult<SearchResultDto>>> SearchProducts(
        [FromQuery] string q, [FromQuery] string? cursor, [FromQuery] int limit = 20, CancellationToken ct = default)
        => ExecuteSearch(q, "product", cursor, limit, ct);

    // ── Shared search logic ──────────────────────────────────────────────────

    private async Task<ActionResult<PagedResult<SearchResultDto>>> ExecuteSearch(
        string q, string? type, string? cursor, int limit, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("Query parameter 'q' is required.");

        limit = Math.Clamp(limit, 1, 50);

        // Build the tsquery string for PostgreSQL full-text matching
        string tsQueryText = ToTsQueryString(q);

        IQueryable<SearchEntry> query = db.SearchEntries
            .AsNoTracking()
            .Where(e => e.SearchVector.Matches(EF.Functions.ToTsQuery(tsQueryText)));

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(e => e.EntityType == type);
        }

        // Cursor is a Base64-encoded timestamp for stable pagination (newest matches first)
        if (cursor is not null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new(ticks, TimeSpan.Zero);
            query = query.Where(e => e.UpdatedAt < before);
        }

        // Order by UpdatedAt descending — most recently indexed results first.
        // Ranking via ts_rank_cd can be added with raw SQL or Elasticsearch in Phase 8.
        List<SearchResultDto> results = await query
            .OrderByDescending(e => e.UpdatedAt)
            .ThenBy(e => e.Id)
            .Take(limit + 1)
            .Select(e => new SearchResultDto(
                e.EntityType,
                e.EntityId,
                e.Title,
                e.Body,
                e.DomainData,
                e.UpdatedAt))
            .ToListAsync(ct);

        bool hasMore = results.Count > limit;
        if (hasMore) results.RemoveAt(results.Count - 1);

        string? nextCursor = null;
        if (hasMore && results.Count > 0)
        {
            SearchResultDto last = results[^1];
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(last.UpdatedAt.UtcTicks.ToString()));
        }

        return Ok(new PagedResult<SearchResultDto>(results, nextCursor, hasMore));
    }

    /// <summary>
    /// Converts a plain user query into a PostgreSQL tsquery-compatible string.
    /// Splits on whitespace and joins with &amp; (AND) for all terms.
    /// </summary>
    private static string ToTsQueryString(string input)
    {
        string[] terms = input.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" & ", terms);
    }
}
