using MediaService.Data;
using MediaService.Dtos;
using MediaService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MediaService.Endpoints;

public static class MediaEndpoints
{
    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder g = app.MapGroup("/media").WithTags("Media");

        // POST /media/upload?category=avatar
        g.MapPost("/upload", [Authorize] async (
            IFormFile file,
            [FromQuery] string category,
            IMediaUploadService uploadSvc,
            HttpContext ctx) =>
        {
            string? uid = ctx.User.FindFirstValue("uid");
            if (uid is null) return Results.Unauthorized();

            if (!Guid.TryParse(uid, out Guid uploadedBy))
                return Results.Unauthorized();

            string[] validCategories = new[] { "avatar", "attachment", "post", "theater", "product" };
            if (!validCategories.Contains(category))
                return Results.BadRequest(new { message = $"Invalid category. Valid values: {string.Join(", ", validCategories)}" });

            try
            {
                MediaUploadResponseDto result = await uploadSvc.UploadAsync(file, uploadedBy, category);
                return Results.Ok(result);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).DisableAntiforgery();

        // GET /media/{mediaId}
        g.MapGet("/{mediaId:guid}", async (Guid mediaId, AppDbContext db) =>
        {
            MediaAsset? asset = await db.MediaAssets.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == mediaId && !a.IsDeleted);
            if (asset is null) return Results.NotFound();

            return Results.Ok(new MediaMetaDto(
                asset.Id, asset.UploadedBy, asset.OriginalName,
                asset.ContentType, asset.SizeBytes, asset.PublicUrl,
                asset.ThumbnailUrl, asset.Category, asset.CreatedAt));
        });

        // DELETE /media/{mediaId}
        g.MapDelete("/{mediaId:guid}", [Authorize] async (
            Guid mediaId,
            AppDbContext db,
            IBlobStorage blob,
            HttpContext ctx) =>
        {
            string? uid = ctx.User.FindFirstValue("uid");
            MediaAsset? asset = await db.MediaAssets.FirstOrDefaultAsync(a => a.Id == mediaId && !a.IsDeleted);
            if (asset is null) return Results.NotFound();
            if (asset.UploadedBy.ToString() != uid)
                return Results.Forbid();

            asset.IsDeleted = true;
            await db.SaveChangesAsync();
            await blob.DeleteAsync(asset.BlobPath);
            return Results.NoContent();
        });

        return app;
    }
}
