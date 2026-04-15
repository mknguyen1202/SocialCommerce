using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using UserService.Auth.Abstractions; // ITokenService (from your Abstractions folder)

namespace UserService.Auth.Jwt;

/// <summary>
/// HS256-based token service. Ensure SymmetricKey is >= 32 bytes (256 bits).
/// </summary>
public sealed class JwtTokenService : ITokenService
{
    private readonly TokenOptions _opt;
    private readonly SigningCredentials _creds;
    private readonly TokenValidationParameters _validation;

    public JwtTokenService(TokenOptions options)
    {
        _opt = options;

        if (string.IsNullOrWhiteSpace(_opt.SymmetricKey))
            throw new InvalidOperationException("TokenOptions.SymmetricKey must be provided for HS256.");

        byte[] keyBytes = Encoding.UTF8.GetBytes(_opt.SymmetricKey);
        if (keyBytes.Length < 32) // 256 bits
            throw new InvalidOperationException($"HS256 key must be at least 256 bits (32 bytes). Current: {keyBytes.Length * 8} bits.");

        SymmetricSecurityKey key = new SymmetricSecurityKey(keyBytes);
        _creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        _validation = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _opt.Issuer,
            ValidateAudience = true,
            ValidAudience = _opt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(_opt.ClockSkewSeconds)
        };
    }

    public string CreateToken(IEnumerable<Claim> claims, DateTimeOffset? expires = null, string? audience = null)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;

        JwtSecurityToken jwt = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: audience ?? _opt.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: (expires ?? now.AddMinutes(_opt.AccessTokenMinutes)).UtcDateTime,
            signingCredentials: _creds
        );

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    public ClaimsPrincipal? ValidateToken(string token, bool validateLifetime = true)
    {
        JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();
        TokenValidationParameters p = _validation.Clone();
        p.ValidateLifetime = validateLifetime;

        try
        {
            ClaimsPrincipal principal = handler.ValidateToken(token, p, out _);
            return principal;
        }
        catch
        {
            return null;
        }
    }
}
