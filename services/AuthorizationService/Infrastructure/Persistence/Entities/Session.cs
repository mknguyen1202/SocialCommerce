namespace AuthorizationService.Infrastructure.Persistence.Entities;

/// <summary>
/// Server-side session (BFF). The Id is the opaque handle stored in the HttpOnly cookie.
/// </summary>
public class Session
{
    public string Id { get; set; } = default!;        // cookie handle
    public string UserId { get; set; } = default!;
    public User User { get; set; } = default!;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? AbsoluteExpiryUtc { get; set; }

    /// <summary>Serialized minimal claims for fast auth decisions (JSON array of {Type,Value}).</summary>
    public string? ClaimsJson { get; set; }

    public ICollection<StoredToken> Tokens { get; set; } = new List<StoredToken>();
}
