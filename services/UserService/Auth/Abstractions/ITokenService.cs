using System.Security.Claims;

namespace UserService.Auth.Abstractions;

/// <summary>
/// Service for minting and validating first-party JWTs (or any token format).
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Creates a signed access token containing the given claims.
    /// </summary>
    /// <param name="claims">Claims to embed in the token (e.g., uid, roles, permissions).</param>
    /// <param name="expires">
    /// Optional explicit expiry (UTC). If null, the implementation’s default lifetime is used.
    /// </param>
    /// <param name="audience">
    /// Optional audience override. If null, the implementation’s default audience is used.
    /// </param>
    /// <returns>The serialized token string.</returns>
    string CreateToken(IEnumerable<Claim> claims, DateTimeOffset? expires = null, string? audience = null);

    /// <summary>
    /// Validates a token’s signature, issuer/audience, and (optionally) lifetime.
    /// </summary>
    /// <param name="token">The serialized token to validate.</param>
    /// <param name="validateLifetime">
    /// True to enforce exp/nbf validation; false to ignore token lifetime (still validates signature).
    /// </param>
    /// <returns>
    /// A <see cref="ClaimsPrincipal"/> if valid; otherwise null.
    /// </returns>
    ClaimsPrincipal? ValidateToken(string token, bool validateLifetime = true);
}
