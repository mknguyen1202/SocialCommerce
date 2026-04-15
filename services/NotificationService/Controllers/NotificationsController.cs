using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Dtos;
using System.Security.Claims;
using System.Text;

namespace NotificationService.Controllers;

[ApiController]
[Authorize]
[Route("notifications")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    // ── List notifications (cursor-paged, newest first) ──────────────────────

    [HttpGet]
    public async Task<ActionResult<PagedResult<NotificationDto>>> List(
        [FromQuery] string? cursor,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        IQueryable<Notification> query = db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == UserId);

        if (cursor is not null)
        {
            long ticks = long.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));
            DateTimeOffset before = new(ticks, TimeSpan.Zero);
            query = query.Where(n => n.CreatedAt < before);
        }

        List<Notification> notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit + 1)
            .ToListAsync(ct);

        bool hasMore = notifications.Count > limit;
        if (hasMore) notifications.RemoveAt(notifications.Count - 1);

        string? nextCursor = null;
        if (hasMore && notifications.Count > 0)
        {
            nextCursor = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(notifications[^1].CreatedAt.UtcTicks.ToString()));
        }

        IEnumerable<NotificationDto> items = notifications.Select(ToDto);
        return Ok(new PagedResult<NotificationDto>(items, nextCursor, hasMore));
    }

    // ── Unread count ─────────────────────────────────────────────────────────

    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> UnreadCount(CancellationToken ct = default)
    {
        int count = await db.Notifications
            .CountAsync(n => n.UserId == UserId && !n.IsRead, ct);

        return Ok(new UnreadCountDto(count));
    }

    // ── Mark single notification as read ─────────────────────────────────────

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct = default)
    {
        Notification? notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId, ct);

        if (notification is null) return NotFound();

        notification.IsRead = true;
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    // ── Mark all as read ─────────────────────────────────────────────────────

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct = default)
    {
        int updated = await db.Notifications
            .Where(n => n.UserId == UserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);

        return Ok(new { updated });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static NotificationDto ToDto(Notification n) => new(
        n.Id,
        n.UserId,
        n.Type,
        n.Domain,
        n.Title,
        n.Body,
        n.ActionUrl,
        n.IsRead,
        n.CreatedAt);
}
