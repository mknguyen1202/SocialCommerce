using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UserService.Auth.Bff.Csrf;
using Xunit;

namespace UserService.Tests.Unit;

public class CsrfMiddlewareTests
{
    private const string CookieName = "App.CSRF";

    private static CsrfMiddleware MakeMiddleware(RequestDelegate next)
    {
        Mock<ICsrfCookieWriter> writer = new Mock<ICsrfCookieWriter>();
        writer.Setup(w => w.CookieName).Returns(CookieName);
        return new CsrfMiddleware(next, NullLogger<CsrfMiddleware>.Instance, writer.Object);
    }

    private static DefaultHttpContext MakeContext(string method, string? cookieValue = null, string? headerValue = null)
    {
        DefaultHttpContext ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Response.Body = new System.IO.MemoryStream();

        if (cookieValue is not null)
            ctx.Request.Headers.Append("Cookie", $"{CookieName}={cookieValue}");

        if (headerValue is not null)
            ctx.Request.Headers.Append(CsrfMiddleware.HeaderName, headerValue);

        return ctx;
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("HEAD")]
    [InlineData("OPTIONS")]
    public async Task SafeMethod_PassesThroughWithoutCsrfCheck(string method)
    {
        bool nextCalled = false;
        CsrfMiddleware middleware = MakeMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        DefaultHttpContext ctx = MakeContext(method);

        await middleware.InvokeAsync(ctx);

        nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public async Task MutatingRequest_WithMatchingCookieAndHeader_CallsNext(string method)
    {
        bool nextCalled = false;
        CsrfMiddleware middleware = MakeMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        DefaultHttpContext ctx = MakeContext(method, cookieValue: "secure-token-abc", headerValue: "secure-token-abc");

        await middleware.InvokeAsync(ctx);

        nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task MutatingRequest_MissingCsrfHeader_Returns403(string method)
    {
        CsrfMiddleware middleware = MakeMiddleware(_ => Task.CompletedTask);
        DefaultHttpContext ctx = MakeContext(method, cookieValue: "token-abc", headerValue: null);

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task MutatingRequest_MissingCsrfCookie_Returns403()
    {
        CsrfMiddleware middleware = MakeMiddleware(_ => Task.CompletedTask);
        DefaultHttpContext ctx = MakeContext("POST", cookieValue: null, headerValue: "token-abc");

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task MutatingRequest_MismatchedTokens_Returns403()
    {
        CsrfMiddleware middleware = MakeMiddleware(_ => Task.CompletedTask);
        DefaultHttpContext ctx = MakeContext("POST", cookieValue: "cookie-token", headerValue: "different-token");

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task MutatingRequest_BothTokensMissing_Returns403(string method)
    {
        CsrfMiddleware middleware = MakeMiddleware(_ => Task.CompletedTask);
        DefaultHttpContext ctx = MakeContext(method);

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }
}
