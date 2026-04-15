using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace RealTimeHub.Hubs;

/// <summary>
/// Maps the "uid" claim to the SignalR user identifier so that
/// Clients.User(userId) targets all connections for that user.
/// </summary>
public sealed class UidUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User?.FindFirstValue("uid");
}
