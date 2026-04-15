using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using AuthorizationService.Security;
using AuthorizationService.Sessions;
using Microsoft.AspNetCore.Http.Extensions;
//using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Options;

namespace AuthorizationService.Bff;

/// <summary>
/// Reverse-proxy for BFF: enforces CSRF on unsafe methods, requires a session,
/// strips incoming Authorization, and (optionally) attaches a short-lived INTERNAL JWT
/// to calls routed to internal microservices.
/// </summary>
public sealed class ProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HttpClient _http;
    private readonly BffProxyOptions _options;
    private readonly ISessionStore _sessions;
    private readonly ICsrfService _csrf;
    private readonly ICookieIssuer _cookieIssuer;
    private readonly IInternalJwtIssuer _internalJwt;

    private static readonly HashSet<string> _hopByHopResponseHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization",
        "TE", "Trailers", "Transfer-Encoding", "Upgrade"
    };

    public ProxyMiddleware(
        RequestDelegate next,
        IHttpClientFactory httpClientFactory,
        IOptions<BffProxyOptions> opt,
        ISessionStore sessions,
        ICsrfService csrf,
        ICookieIssuer cookieIssuer,
        IInternalJwtIssuer internalJwt)
    {
        _next = next;
        _http = httpClientFactory.CreateClient(nameof(ProxyMiddleware));
        _options = opt.Value;
        _sessions = sessions;
        _csrf = csrf;
        _cookieIssuer = cookieIssuer;
        _internalJwt = internalJwt;

        if (_options?.Routes is null || _options.Routes.Count == 0)
            throw new InvalidOperationException("BffProxyOptions.Routes must be configured.");
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only proxy paths that match a configured prefix; otherwise continue pipeline.
        var route = MatchRoute(context.Request.Path);
        if (route is null)
        {
            await _next(context);
            return;
        }

        // CSRF: allow preflight; otherwise enforce CSRF for unsafe methods.
        if (HttpMethods.IsOptions(context.Request.Method))
        {
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return;
        }
        if (IsUnsafeMethod(context.Request.Method))
        {
            var handle = _cookieIssuer.TryGetHandle(context);
            if (handle is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            var headerToken = context.Request.Headers["X-CSRF-Token"].ToString();
            if (!_csrf.Validate(context, handle, headerToken))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        // Resolve session unless route allows anonymous.
        string? sessionHandle = null;
        SessionRecord? session = null;
        if (!route.AllowAnonymous)
        {
            sessionHandle = _cookieIssuer.TryGetHandle(context);
            if (sessionHandle is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            session = await _sessions.GetAsync(sessionHandle);
            if (session is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
        }

        // Build outgoing request
        var targetUri = BuildTargetUri(route, context.Request);
        if (targetUri is null)
        {
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsync("Unable to resolve destination.");
            return;
        }

        using var reqMessage = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);

        // Copy headers, except hop-by-hop and Authorization (we control it).
        foreach (var header in context.Request.Headers)
        {
            if (header.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                continue;
            if (!reqMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            {
                reqMessage.Content ??= new StreamContent(Stream.Null);
                reqMessage.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }

        // Add standard forwarding headers
        AddForwardHeaders(context, reqMessage);

        // Body (streaming)
        if (HasBody(context.Request.Method))
        {
            reqMessage.Content = new StreamContent(context.Request.Body);
            if (!string.IsNullOrEmpty(context.Request.ContentType))
                reqMessage.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
            if (context.Request.ContentLength.HasValue)
                reqMessage.Content.Headers.ContentLength = context.Request.ContentLength.Value;
        }

        // Attach INTERNAL JWT if configured and we have a session
        if (route.AttachInternalJwt && session is not null)
        {
            // Generate a very short-lived internal token
            var internalJwt = _internalJwt.IssueInternalJwt(session.User, session.Claims, session.Id);
            reqMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", internalJwt);
        }

        // Timeout per route if configured
        using var cts = route.TimeoutSeconds is > 0
            ? new CancellationTokenSource(TimeSpan.FromSeconds(route.TimeoutSeconds!.Value))
            : new CancellationTokenSource();

        HttpResponseMessage? upstream = null;
        try
        {
            upstream = await _http.SendAsync(reqMessage, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested)
        {
            context.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            return;
        }
        catch (HttpRequestException ex)
        {
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsync($"Upstream error: {ex.Message}");
            return;
        }

        // Propagate status code
        context.Response.StatusCode = (int)upstream.StatusCode;

        // Copy response headers (minus hop-by-hop and Set-Cookie—avoid cookie confusion)
        foreach (var header in upstream.Headers)
        {
            if (_hopByHopResponseHeaders.Contains(header.Key)) continue;
            if (header.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase)) continue;
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }
        foreach (var header in upstream.Content.Headers)
        {
            if (_hopByHopResponseHeaders.Contains(header.Key)) continue;
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }
        // Ensure ASP.NET Core doesn't infer chunking incorrectly
        context.Response.Headers.Remove("transfer-encoding");

        // Stream response body
        using var responseStream = await upstream.Content.ReadAsStreamAsync();
        await responseStream.CopyToAsync(context.Response.Body);
    }

    private BffRoute? MatchRoute(PathString path)
    {
        // Longest prefix match
        BffRoute? best = null;
        foreach (var r in _options.Routes)
        {
            if (!path.HasValue) continue;
            if (!path.Value!.StartsWith(r.PathPrefix, StringComparison.OrdinalIgnoreCase)) continue;
            if (best is null || r.PathPrefix.Length > best.PathPrefix.Length) best = r;
        }
        return best;
    }

    private static bool IsUnsafeMethod(string method)
        => !(HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsTrace(method));

    private static bool HasBody(string method)
        => HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method);

    private static void AddForwardHeaders(HttpContext ctx, HttpRequestMessage req)
    {
        var remoteIp = ctx.Connection.RemoteIpAddress?.ToString();
        var proto = ctx.Request.Scheme;
        if (!string.IsNullOrEmpty(remoteIp))
            req.Headers.TryAddWithoutValidation("X-Forwarded-For", remoteIp);
        req.Headers.TryAddWithoutValidation("X-Forwarded-Proto", proto);
        req.Headers.TryAddWithoutValidation("X-Forwarded-Host", ctx.Request.Host.Value);
    }

    private static Uri? BuildTargetUri(BffRoute route, HttpRequest request)
    {
        if (!Uri.TryCreate(route.Destination, UriKind.Absolute, out var destBase))
            return null;

        // Rewrite: /api/user/profile -> {Destination}/user/profile (strip prefix)
        var suffix = request.Path.Value!.Substring(route.PathPrefix.Length).TrimStart('/');
        var builder = new UriBuilder(destBase);
        var path = builder.Path;
        if (!path.EndsWith("/")) path += "/";
        builder.Path = path + suffix;

        // Copy query
        var query = request.QueryString.HasValue ? request.QueryString.Value : string.Empty;
        builder.Query = string.IsNullOrEmpty(query) ? "" : query.TrimStart('?');
        return builder.Uri;
    }
}

/// <summary>Options for the BFF proxy; configure in appsettings or code.</summary>
public sealed class BffProxyOptions
{
    public List<BffRoute> Routes { get; set; } = new();
}

public sealed class BffRoute
{
    /// <summary>Incoming path prefix, e.g. "/api/user/". Match is case-insensitive; longest prefix wins.</summary>
    public string PathPrefix { get; set; } = "/api/";
    /// <summary>Destination base URI, e.g. "http://userservice:8080/". Must be absolute.</summary>
    public string Destination { get; set; } = "http://localhost:8080/";
    /// <summary>Attach an INTERNAL JWT for downstream auth.</summary>
    public bool AttachInternalJwt { get; set; } = true;
    /// <summary>Allow requests without a session (rare).</summary>
    public bool AllowAnonymous { get; set; } = false;
    /// <summary>Per-route timeout; if null or &lt;= 0, use HttpClient default.</summary>
    public int? TimeoutSeconds { get; set; }
}

/// <summary>Issues short-lived INTERNAL JWTs (RS256 preferred; HS256 supported for dev).</summary>
public interface IInternalJwtIssuer
{
    string IssueInternalJwt(AppUser user, IEnumerable<Claim> userClaims, string sessionId);
}

/// <summary>Config for internal JWT issuance.</summary>
public sealed class InternalJwtOptions
{
    public string Issuer { get; set; } = "auth";
    public string Audience { get; set; } = "internal";
    /// <summary>Lifetime in seconds; default 180s.</summary>
    public int LifetimeSeconds { get; set; } = 180;

    // RS256 (preferred)
    public string? RsaPrivateKeyPem { get; set; } // -----BEGIN RSA PRIVATE KEY-----…

    // HS256 (dev)
    public string? SymmetricKey { get; set; } // base64 or raw utf8; must be >= 32 bytes if utf8
}

public sealed class DefaultInternalJwtIssuer : IInternalJwtIssuer
{
    private readonly InternalJwtOptions _opt;
    private readonly TimeProvider _time;

    public DefaultInternalJwtIssuer(IOptions<InternalJwtOptions> opt, TimeProvider? time = null)
    {
        _opt = opt.Value;
        _time = time ?? TimeProvider.System;
    }

    public string IssueInternalJwt(AppUser user, IEnumerable<Claim> userClaims, string sessionId)
    {
        var now = _time.GetUtcNow().UtcDateTime;

        var claims = new List<Claim>
        {
            new("sub", user.Id),
            new("sid", sessionId),
            new("name", user.Name ?? user.Email ?? user.Id),
        };
        // Keep claims minimal: copy roles & perms only
        claims.AddRange(userClaims.Where(c => c.Type is "role" or "perm"));

        var descriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Issuer = _opt.Issuer,
            Audience = _opt.Audience,
            NotBefore = now.AddSeconds(-5),
            Expires = now.AddSeconds(Math.Max(30, _opt.LifetimeSeconds)),
            Claims = claims.ToDictionary(c => c.Type, c => (object)c.Value, StringComparer.Ordinal),
            SigningCredentials = CreateSigningCredentials(_opt)
        };

        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var token = handler.CreateJwtSecurityToken(descriptor);
        return handler.WriteToken(token);
    }

    private static Microsoft.IdentityModel.Tokens.SigningCredentials CreateSigningCredentials(InternalJwtOptions opt)
    {
        if (!string.IsNullOrWhiteSpace(opt.RsaPrivateKeyPem))
        {
            using var rsa = System.Security.Cryptography.RSA.Create();
            rsa.ImportFromPem(opt.RsaPrivateKeyPem);
            var key = new Microsoft.IdentityModel.Tokens.RsaSecurityKey(rsa)
            {
                KeyId = Guid.NewGuid().ToString("N")
            };
            return new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.RsaSha256);
        }

        if (!string.IsNullOrWhiteSpace(opt.SymmetricKey))
        {
            // Accept either base64 or raw utf8
            byte[] keyBytes;
            try { keyBytes = Convert.FromBase64String(opt.SymmetricKey); }
            catch { keyBytes = Encoding.UTF8.GetBytes(opt.SymmetricKey); }
            if (keyBytes.Length < 32) throw new InvalidOperationException("InternalJwtOptions.SymmetricKey must be at least 32 bytes.");
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(keyBytes);
            return new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
        }

        throw new InvalidOperationException("No signing key configured: set RsaPrivateKeyPem (preferred) or SymmetricKey.");
    }
}

// ========= Contracts pulled from your other folders ===========
// (Kept minimal so this file compiles on its own; you already have real ones.)

//public interface ISessionStore
//{
//    Task<SessionRecord?> GetAsync(string handle);
//}

//public interface ICsrfService
//{
//    bool Validate(HttpContext ctx, string sessionHandle, string? headerToken);
//}

//public interface ICookieIssuer
//{
//    string? TryGetHandle(HttpContext ctx);
//}

//public sealed record SessionRecord(
//    string Id,
//    AppUser User,
//    IReadOnlyList<Claim> Claims
//);

//public sealed record AppUser(
//    string Id,
//    string? Email,
//    string? Name,
//    string? Picture
//);

// ------------------------ DI HINTS ----------------------------
// builder.Services.AddHttpClient(nameof(ProxyMiddleware));
// builder.Services.Configure<BffProxyOptions>(configuration.GetSection("BffProxy"));
// builder.Services.Configure<InternalJwtOptions>(configuration.GetSection("InternalJwt"));
// builder.Services.AddSingleton<IInternalJwtIssuer, DefaultInternalJwtIssuer>();
// app.UseMiddleware<AuthorizationService.Bff.ProxyMiddleware>();
