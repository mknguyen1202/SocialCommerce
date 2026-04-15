using System.Security.Claims;
using FluentAssertions;
using UserService.Auth.Jwt;
using Xunit;

namespace UserService.Tests.Unit;

public class JwtTokenServiceTests
{
    private static JwtTokenService MakeService(string key = "test-secret-key-min-32-bytes-long!!")
    {
        TokenOptions options = new TokenOptions
        {
            SymmetricKey = key,
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            AccessTokenMinutes = 15,
            ClockSkewSeconds = 0
        };
        return new JwtTokenService(options);
    }

    [Fact]
    public void CreateToken_ContainsExpectedClaims()
    {
        JwtTokenService sut = MakeService();
        List<Claim> claims = new List<Claim>
        {
            new Claim("uid", "user-123"),
            new Claim("permission", "user.read")
        };

        string token = sut.CreateToken(claims);
        ClaimsPrincipal? principal = sut.ValidateToken(token);

        principal.Should().NotBeNull();
        principal!.FindFirstValue("uid").Should().Be("user-123");
        principal!.FindFirstValue("permission").Should().Be("user.read");
    }

    [Fact]
    public void ValidateToken_ReturnsNull_WhenTokenIsExpired()
    {
        JwtTokenService sut = MakeService();
        string token = sut.CreateToken(
            new[] { new Claim("uid", "user-456") },
            expires: DateTimeOffset.UtcNow.AddSeconds(-10));

        ClaimsPrincipal? result = sut.ValidateToken(token, validateLifetime: true);

        result.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_ReturnsNull_WhenSignatureIsTampered()
    {
        JwtTokenService sut = MakeService();
        string token = sut.CreateToken(new[] { new Claim("uid", "user-789") });
        string tampered = token[..^5] + "XXXXX";

        ClaimsPrincipal? result = sut.ValidateToken(tampered);

        result.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_IgnoresExpiry_WhenValidateLifetimeIsFalse()
    {
        JwtTokenService sut = MakeService();
        string token = sut.CreateToken(
            new[] { new Claim("uid", "user-000") },
            expires: DateTimeOffset.UtcNow.AddSeconds(-10));

        ClaimsPrincipal? result = sut.ValidateToken(token, validateLifetime: false);

        result.Should().NotBeNull();
        result!.FindFirstValue("uid").Should().Be("user-000");
    }

    [Fact]
    public void ValidateToken_ReturnsNull_WhenTokenIsInvalidFormat()
    {
        JwtTokenService sut = MakeService();

        ClaimsPrincipal? result = sut.ValidateToken("not.a.valid.jwt.token");

        result.Should().BeNull();
    }

    [Fact]
    public void Constructor_Throws_WhenKeyIsTooShort()
    {
        TokenOptions options = new TokenOptions { SymmetricKey = "tooshort" };

        Action act = () => new JwtTokenService(options);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*256 bits*");
    }

    [Fact]
    public void Constructor_Throws_WhenKeyIsEmpty()
    {
        TokenOptions options = new TokenOptions { SymmetricKey = "" };

        Action act = () => new JwtTokenService(options);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CreateToken_WithAudienceOverride_ValidatesAgainstOverriddenAudience()
    {
        JwtTokenService sut = MakeService();

        string token = sut.CreateToken(
            new[] { new Claim("uid", "u1") },
            audience: "TestAudience");

        ClaimsPrincipal? principal = sut.ValidateToken(token);

        principal.Should().NotBeNull();
    }

    [Fact]
    public void ValidateToken_ReturnsNull_WhenIssuedByDifferentKey()
    {
        JwtTokenService issuer = MakeService("issuer-secret-key-min-32-bytes-long-xx");
        JwtTokenService validator = MakeService("validator-secret-key-min-32-bytes--xx");
        string token = issuer.CreateToken(new[] { new Claim("uid", "u2") });

        ClaimsPrincipal? result = validator.ValidateToken(token);

        result.Should().BeNull();
    }
}
