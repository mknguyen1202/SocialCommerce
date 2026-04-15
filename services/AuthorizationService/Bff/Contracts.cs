// File: Bff/Contracts.cs
using System.Security.Claims;

namespace AuthorizationService.Bff
{
    public sealed record AppUser(
        string Id,
        string? Email,
        string? Name,
        string? Picture
    );

    public sealed record SessionRecord(
        string Id,
        AppUser User,
        IReadOnlyList<Claim> Claims
    );
}
