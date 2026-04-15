using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace UserService.Auth.Bff.Csrf;

/// <summary>
/// Double-submit CSRF validator: for POST/PUT/PATCH/DELETE, requires header X-CSRF
/// to match the cookie value (App.CSRF). Bypasses GET/HEAD/OPTIONS.
/// </summary>
public sealed class CsrfMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CsrfMiddleware> _logger;
    private readonly ICsrfCookieWriter _writer;

    public const string HeaderName = "X-CSRF";

    public CsrfMiddleware(RequestDelegate next, ILogger<CsrfMiddleware> logger, ICsrfCookieWriter writer)
    {
        _next = next;
        _logger = logger;
        _writer = writer;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        string method = ctx.Request.Method;

        // Allow safe methods + CORS preflight
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
        {
            await _next(ctx);
            return;
        }

        // Validate write requests
        string header = ctx.Request.Headers[HeaderName].ToString();
        string? cookie = ctx.Request.Cookies[_writer.CookieName];

        if (string.IsNullOrEmpty(cookie) || string.IsNullOrEmpty(header) || !FixedTimeEquals(cookie, header))
        {
            _logger.LogWarning("CSRF validation failed for {Path}. Missing/invalid header or cookie.", ctx.Request.Path);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsync("CSRF validation failed");
            return;
        }

        await _next(ctx);
    }

    // Prevent timing attacks on token compare
    private static bool FixedTimeEquals(string a, string b)
    {
        byte[] ba = System.Text.Encoding.UTF8.GetBytes(a);
        byte[] bb = System.Text.Encoding.UTF8.GetBytes(b);
        if (ba.Length != bb.Length) return false;

        int diff = 0;
        for (int i = 0; i < ba.Length; i++) diff |= ba[i] ^ bb[i];
        return diff == 0;
    }
}

public static class CsrfMiddlewareExtensions
{
    /// <summary>Enable double-submit CSRF validation.</summary>
    public static IApplicationBuilder UseCsrfDoubleSubmit(this IApplicationBuilder app)
        => app.UseMiddleware<CsrfMiddleware>();
}
