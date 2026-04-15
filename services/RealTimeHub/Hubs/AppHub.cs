using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace RealTimeHub.Hubs;

[Authorize]
public class AppHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        string? userId = Context.User?.FindFirstValue("uid");
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");

        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(string conversationId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{conversationId}");

    public async Task LeaveConversation(string conversationId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationId}");

    public async Task JoinTheater(string theaterId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"theater:{theaterId}");

    public async Task LeaveTheater(string theaterId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"theater:{theaterId}");

    public async Task SubscribePresence(string userId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"presence:{userId}");

    public async Task UnsubscribePresence(string userId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"presence:{userId}");

    public async Task JoinFeed(string userId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"feed:{userId}");
}
