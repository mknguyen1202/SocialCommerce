using System.Security.Claims;

namespace AuthorizationService.Bff;

/// <summary>
/// Input the controller passes after token exchange & (optional) ID token validation.
/// </summary>
public sealed class ClaimsEnricherInput
{
    public required string Provider { get; init; }           // "google", "microsoft", "facebook", "apple"
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }
    public string? IdToken { get; init; }
    public DateTimeOffset ExpiresAtUtc { get; init; }
    public OidcIdTokenPayload? IdPayload { get; init; }      // Present for OIDC (Google/Microsoft/Apple)
}

/// <summary>
/// Minimal shape of an ID token payload the validator returns. Extend as needed.
/// </summary>
public sealed class OidcIdTokenPayload
{
    public string? Sub { get; init; }
    public string? Email { get; init; }
    public bool? EmailVerified { get; init; }
    public string? Name { get; init; }
    public string? Picture { get; init; }
    // Microsoft
    public string? Oid { get; init; }
    public string? Tid { get; init; }
    public string? PreferredUsername { get; init; }
}

/// <summary>
/// Output used by the callback controller to build a session.
/// </summary>
public sealed class ClaimsEnricherResult
{
    public required AppUser User { get; init; }
    public required IReadOnlyList<Claim> Claims { get; init; }
}

public interface IClaimsEnricher
{
    Task<ClaimsEnricherResult> EnrichAsync(ClaimsEnricherInput input);
}

/// <summary>
/// Maps provider claims to app user identity + app claims.
/// Keep it stateless; do DB linking in a separate service if needed.
/// </summary>
public sealed class ClaimsEnricher : IClaimsEnricher
{
    private static readonly string[] _defaultUserRole = new[] { "user" };

    public Task<ClaimsEnricherResult> EnrichAsync(ClaimsEnricherInput input)
    {
        // Derive a stable app user id and primary fields
        var (userId, email, name, picture, additionalClaims) = input.Provider.ToLowerInvariant() switch
        {
            "google" => FromGoogle(input.IdPayload),
            "microsoft" => FromMicrosoft(input.IdPayload),
            "apple" => FromApple(input.IdPayload),
            "facebook" => FromFacebook(input.IdPayload),
            _ => throw new InvalidOperationException($"Unknown provider: {input.Provider}")
        };

        // Build claims: minimal + roles; you can add app-specific perms here
        var claims = new List<Claim>
        {
            new("sub", userId),
            new("provider", input.Provider),
        };
        if (!string.IsNullOrWhiteSpace(email)) claims.Add(new("email", email!));
        if (!string.IsNullOrWhiteSpace(name)) claims.Add(new("name", name!));

        // roles
        foreach (var role in _defaultUserRole)
            claims.Add(new Claim("role", role));

        // carry over any provider-specific identity keys you find useful
        claims.AddRange(additionalClaims);

        var user = new AppUser(userId, email, name, picture);
        return Task.FromResult(new ClaimsEnricherResult
        {
            User = user,
            Claims = claims
        });
    }

    private static (string userId, string? email, string? name, string? picture, List<Claim> extra) FromGoogle(OidcIdTokenPayload? p)
    {
        if (p is null || string.IsNullOrEmpty(p.Sub))
            throw new InvalidOperationException("Google user missing 'sub' from ID token payload.");
        var id = $"google:{p.Sub}";
        var extra = new List<Claim>
        {
            new("google:sub", p.Sub)
        };
        if (p.Email is not null) extra.Add(new("email_verified", (p.EmailVerified ?? false).ToString().ToLowerInvariant()));
        return (id, p.Email, p.Name, p.Picture, extra);
    }

    private static (string userId, string? email, string? name, string? picture, List<Claim> extra) FromMicrosoft(OidcIdTokenPayload? p)
    {
        // For Entra ID, oid is the stable user object id.
        var oid = p?.Oid ?? p?.Sub; // fallback
        if (string.IsNullOrEmpty(oid))
            throw new InvalidOperationException("Microsoft user missing 'oid'/'sub'.");
        var id = $"microsoft:{oid}";
        var email = p?.PreferredUsername ?? p?.Email;
        var name = p?.Name ?? email;
        var extra = new List<Claim>
        {
            new("ms:oid", oid)
        };
        if (!string.IsNullOrEmpty(p?.Tid)) extra.Add(new("ms:tid", p!.Tid!));
        return (id, email, name, p?.Picture, extra);
    }

    private static (string userId, string? email, string? name, string? picture, List<Claim> extra) FromApple(OidcIdTokenPayload? p)
    {
        // Apple provides 'sub'; email may be a private relay and name is only present on first login.
        if (p is null || string.IsNullOrEmpty(p.Sub))
            throw new InvalidOperationException("Apple user missing 'sub'.");
        var id = $"apple:{p.Sub}";
        var extra = new List<Claim> { new("apple:sub", p.Sub) };
        return (id, p.Email, p.Name, p.Picture, extra);
    }

    private static (string userId, string? email, string? name, string? picture, List<Claim> extra) FromFacebook(OidcIdTokenPayload? p)
    {
        // Facebook is not pure OIDC; assume upstream filled p.Sub from profile lookup.
        if (p is null || string.IsNullOrEmpty(p.Sub))
            throw new InvalidOperationException("Facebook user missing 'sub' (ensure userinfo profile fetch upstream).");
        var id = $"facebook:{p.Sub}";
        var extra = new List<Claim> { new("fb:id", p.Sub) };
        return (id, p.Email, p.Name, p.Picture, extra);
    }
}
