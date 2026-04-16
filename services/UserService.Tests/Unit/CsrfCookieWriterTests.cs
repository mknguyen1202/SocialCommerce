using FluentAssertions;
using Microsoft.AspNetCore.Http;
using UserService.Auth.Bff;
using UserService.Auth.Bff.Csrf;
using Xunit;

namespace UserService.Tests.Unit;

public class CsrfCookieWriterTests
{
    private static CsrfCookieWriter MakeWriter(bool crossSite = false, string? domain = null)
    {
        BffCookieOptions opts = new BffCookieOptions
        {
            CrossSite = crossSite,
            Domain = domain
        };
        return new CsrfCookieWriter(opts);
    }

    private static DefaultHttpContext MakeContext()
    {
        DefaultHttpContext ctx = new DefaultHttpContext();
        ctx.Response.Body = new System.IO.MemoryStream();
        return ctx;
    }

    [Fact]
    public void CookieName_ReturnsCsrfCookieName()
    {
        CsrfCookieWriter writer = MakeWriter();

        writer.CookieName.Should().Be(CookieSchemes.CsrfCookieName);
    }

    [Fact]
    public void Write_ReturnsNonEmptyHexToken()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx = MakeContext();

        string token = writer.Write(ctx);

        token.Should().NotBeNullOrEmpty();
        token.Should().MatchRegex("^[0-9A-F]{64}$");
    }

    [Fact]
    public void Write_EachCallReturnsUniqueToken()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx1 = MakeContext();
        DefaultHttpContext ctx2 = MakeContext();

        string token1 = writer.Write(ctx1);
        string token2 = writer.Write(ctx2);

        token1.Should().NotBe(token2);
    }

    [Fact]
    public void Write_AppendsCookieToResponse()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().Contain(CookieSchemes.CsrfCookieName);
    }

    [Fact]
    public void Write_SameSite_WhenNotCrossSite_UsesLax()
    {
        CsrfCookieWriter writer = MakeWriter(crossSite: false);
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("samesite=lax");
    }

    [Fact]
    public void Write_SameSite_WhenCrossSite_UsesNone()
    {
        CsrfCookieWriter writer = MakeWriter(crossSite: true);
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("samesite=none");
    }

    [Fact]
    public void Write_Cookie_IsNotHttpOnly()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().NotContainEquivalentOf("httponly");
    }

    [Fact]
    public void Write_Cookie_IsSecure()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("secure");
    }

    [Fact]
    public void Write_WithDomain_IncludesDomainInCookie()
    {
        CsrfCookieWriter writer = MakeWriter(domain: ".example.com");
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().Contain(".example.com");
    }

    [Fact]
    public void Write_WithoutDomain_DoesNotIncludeDomainAttribute()
    {
        CsrfCookieWriter writer = MakeWriter(domain: null);
        DefaultHttpContext ctx = MakeContext();

        writer.Write(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().NotContain("domain=");
    }

    [Fact]
    public void Delete_RemovesCsrfCookie()
    {
        CsrfCookieWriter writer = MakeWriter();
        DefaultHttpContext ctx = MakeContext();

        writer.Delete(ctx);

        // Deleting a cookie appends it with an expired Max-Age or Expires
        ctx.Response.Headers.SetCookie.ToString().Should().Contain(CookieSchemes.CsrfCookieName);
        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("expires=");
    }

    [Fact]
    public void Delete_SameSite_WhenNotCrossSite_UsesLax()
    {
        CsrfCookieWriter writer = MakeWriter(crossSite: false);
        DefaultHttpContext ctx = MakeContext();

        writer.Delete(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("samesite=lax");
    }

    [Fact]
    public void Delete_SameSite_WhenCrossSite_UsesNone()
    {
        CsrfCookieWriter writer = MakeWriter(crossSite: true);
        DefaultHttpContext ctx = MakeContext();

        writer.Delete(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().ContainEquivalentOf("samesite=none");
    }

    [Fact]
    public void Delete_WithDomain_IncludesDomainInCookie()
    {
        CsrfCookieWriter writer = MakeWriter(domain: ".example.com");
        DefaultHttpContext ctx = MakeContext();

        writer.Delete(ctx);

        ctx.Response.Headers.SetCookie.ToString().Should().Contain(".example.com");
    }
}
