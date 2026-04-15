using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CommerceService.Data;
using System.Security.Claims;

namespace CommerceService.Controllers;

[ApiController]
[Authorize]
[Route("reviews")]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("uid")
        ?? throw new InvalidOperationException("uid claim missing"));

    [HttpPost("{reviewId:guid}/helpful")]
    public async Task<IActionResult> MarkHelpful(Guid reviewId, CancellationToken ct = default)
    {
        Review? review = await db.Reviews.FindAsync([reviewId], ct);
        if (review == null) return NotFound();

        bool exists = await db.ReviewHelpfuls
            .AnyAsync(h => h.ReviewId == reviewId && h.UserId == UserId, ct);
        if (exists) return Conflict(new { error = "Already marked as helpful." });

        db.ReviewHelpfuls.Add(new ReviewHelpful { ReviewId = reviewId, UserId = UserId });
        review.HelpfulCount++;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{reviewId:guid}/helpful")]
    public async Task<IActionResult> RemoveHelpful(Guid reviewId, CancellationToken ct = default)
    {
        ReviewHelpful? helpful = await db.ReviewHelpfuls
            .FirstOrDefaultAsync(h => h.ReviewId == reviewId && h.UserId == UserId, ct);
        if (helpful == null) return NotFound();

        db.ReviewHelpfuls.Remove(helpful);

        Review? review = await db.Reviews.FindAsync([reviewId], ct);
        if (review != null && review.HelpfulCount > 0) review.HelpfulCount--;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
