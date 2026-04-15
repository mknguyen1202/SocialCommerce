namespace AuthorizationService.Infrastructure.Persistence.Entities;

public class User
{
    // Stable application user id (e.g., "google:123", "microsoft:{oid}", etc.)
    public string Id { get; set; } = default!;

    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Picture { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ExternalLogin> ExternalLogins { get; set; } = new List<ExternalLogin>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
