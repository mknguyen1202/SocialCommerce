using Microsoft.AspNetCore.Authorization;
using PresenceService.Dtos;
using PresenceService.Services;
using System.Security.Claims;

namespace PresenceService.Endpoints;

public static class PresenceEndpoints
{
    public static IEndpointRouteBuilder MapPresenceEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/presence").WithTags("Presence");

        // POST /presence/heartbeat
        group.MapPost("/heartbeat", async (
            HeartbeatRequest req,
            PresenceRedisService svc,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            Guid userId = GetUserId(ctx);
            string status = req.Status is "online" or "idle" or "dnd" ? req.Status : "online";
            await svc.HeartbeatAsync(userId, status, ct);
            return Results.NoContent();
        }).RequireAuthorization();

        // POST /presence/bulk
        group.MapPost("/bulk", async (
            BulkPresenceRequest req,
            PresenceRedisService svc) =>
        {
            IReadOnlyList<PresenceDto> results = await svc.BulkGetAsync(req.UserIds);
            return Results.Ok(results);
        }).RequireAuthorization();

        // GET /presence/{userId}
        group.MapGet("/{userId:guid}", async (
            Guid userId,
            PresenceRedisService svc) =>
        {
            PresenceDto presence = await svc.GetAsync(userId);
            return Results.Ok(presence);
        }).RequireAuthorization();

        // POST /presence/typing
        group.MapPost("/typing", async (
            TypingRequest req,
            PresenceRedisService svc,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            Guid userId = GetUserId(ctx);
            await svc.SetTypingAsync(userId, req.ConversationId, req.IsTyping, ct);
            return Results.NoContent();
        }).RequireAuthorization();

        return app;
    }

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirstValue("uid")
            ?? throw new InvalidOperationException("uid claim missing"));
}
