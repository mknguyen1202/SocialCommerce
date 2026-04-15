namespace AuthorizationService.Infrastructure.Persistence.Entities;

public class ExternalLogin
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    public string UserId { get; set; } = default!;
    public User User { get; set; } = default!;

    public string Provider { get; set; } = default!;        // "google", "microsoft", "facebook", "apple"
    public string ProviderSubject { get; set; } = default!; // provider-specific stable subject
    public string? Email { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastLoginAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
