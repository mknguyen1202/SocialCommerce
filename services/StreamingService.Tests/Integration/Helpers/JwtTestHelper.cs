using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace StreamingService.Tests.Integration.Helpers;

/// <summary>
/// Issues HS256 JWTs that match what UserService (BFF) issues,
/// so integration test HTTP clients can authenticate against StreamingService.
/// </summary>
public static class JwtTestHelper
{
    // Must match appsettings.json used in tests
    public const string TestSymmetricKey = "test-streaming-symmetric-key-min-32-bytes!!";
    public const string TestIssuer = "SocialCommerce";

    public static string IssueToken(Guid userId, TimeSpan? lifetime = null)
    {
        SymmetricSecurityKey key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSymmetricKey));
        SigningCredentials creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token = new JwtSecurityToken(
            issuer: TestIssuer,
            claims: [new Claim("uid", userId.ToString())],
            expires: DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromMinutes(15)),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
