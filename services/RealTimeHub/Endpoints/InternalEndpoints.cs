using Microsoft.AspNetCore.SignalR;
using RealTimeHub.Hubs;
using RealTimeHub.Models;

namespace RealTimeHub.Endpoints;

public static class InternalEndpoints
{
    public static IEndpointRouteBuilder MapInternalEndpoints(this IEndpointRouteBuilder app, string apiKey)
    {
        RouteGroupBuilder g = app.MapGroup("/internal").WithTags("Internal");

        // POST /internal/hub/publish
        // Called by domain services (not exposed publicly).
        // Guarded by X-Internal-Api-Key header.
        g.MapPost("/hub/publish", async (
            PublishRequest req,
            IHubContext<AppHub> hub,
            HttpContext ctx) =>
        {
            string? key = ctx.Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            if (string.IsNullOrEmpty(key) || key != apiKey)
                return Results.StatusCode(401);

            await hub.Clients.Group(req.Group).SendAsync(req.Event, req.Payload);
            return Results.Ok();
        });

        return app;
    }
}
