namespace AuthorizationService.Infrastructure.Persistence.Entities;

/// <summary>
/// Provider tokens for a session, encrypted at rest via Data Protection.
/// </summary>
public class StoredToken
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    public string SessionId { get; set; } = default!;
    public Session Session { get; set; } = default!;

    public string Provider { get; set; } = default!; // "google", "microsoft", etc.
    public string ProtectedPayload { get; set; } = default!; // encrypted ProviderTokenRecord JSON

    public DateTimeOffset ExpiresAtUtc { get; set; }
    public string? Scopes { get; set; }
}
