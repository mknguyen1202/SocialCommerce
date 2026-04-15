namespace UserService.Auth.Jwt;

/// <summary>
/// Options for minting and validating first-party JWTs (service-to-service / mobile).
/// </summary>
public sealed class TokenOptions
{
    /// <summary>Issuer for tokens you mint (e.g., "https://api.example.com").</summary>
    public string Issuer { get; init; } = "UserService";
    /// <summary>Default audience your APIs expect.</summary>
    public string Audience { get; init; } = "UserService.Api";

    /// <summary>
    /// Symmetric signing key (base64 or raw string). HS256 requires >= 256 bits.
    /// Prefer a long, random secret (at least 32 bytes).
    /// </summary>
    public string SymmetricKey { get; init; } = ""; // if empty, you must provide RSA/ECDSA externally

    /// <summary>Access token lifetime (minutes).</summary>
    public int AccessTokenMinutes { get; init; } = 15;

    /// <summary>Clock skew (seconds) for validation.</summary>
    public int ClockSkewSeconds { get; init; } = 60;
}
