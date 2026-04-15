using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

namespace AuthorizationService.Oidc;

public interface IIdTokenValidator
{
    Task<IdTokenValidationResult> ValidateAsync(IProvider provider, string idToken, string? expectedNonce);
}

public sealed class IdTokenValidator : IIdTokenValidator
{
    private readonly IHttpClientFactory _http;
    private readonly IMemoryCache _cache;

    public IdTokenValidator(IHttpClientFactory http, IMemoryCache cache)
    {
        _http = http;
        _cache = cache;
    }

    public async Task<IdTokenValidationResult> ValidateAsync(IProvider provider, string idToken, string? expectedNonce)
    {
        if (string.IsNullOrWhiteSpace(provider.JwksUri))
            return IdTokenValidationResult.Fail("Provider has no JWKS configured.");

        var keys = await GetJwksAsync(provider.JwksUri!);
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys,
            ValidateIssuer = !string.IsNullOrWhiteSpace(provider.Authority),
            ValidIssuer = provider.Authority,
            ValidateAudience = true,
            ValidAudience = provider.ClientId,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        var handler = new JwtSecurityTokenHandler();
        try
        {
            var principal = handler.ValidateToken(idToken, validationParams, out var token);
            if (expectedNonce is not null)
            {
                var nonce = principal.FindFirstValue("nonce");
                if (!string.Equals(nonce, expectedNonce, StringComparison.Ordinal))
                    return IdTokenValidationResult.Fail("Nonce mismatch.");
            }

            var payload = MapToPayload(principal);
            return IdTokenValidationResult.Ok(payload);
        }
        catch (Exception ex)
        {
            return IdTokenValidationResult.Fail($"ID token validation failed: {ex.Message}");
        }
    }

    //private static AuthorizationService.Bff.OidcIdTokenPayload MapToPayload(ClaimsPrincipal p)
    //{
    //    string? Get(string type) => p.FindFirstValue(type);
    //    bool? GetBool(string type)
    //    {
    //        var v = p.FindFirstValue(type);
    //        if (bool.TryParse(v, out var b)) return b;
    //        return null;
    //    }

    //    return new AuthorizationService.Bff.OidcIdTokenPayload
    //    {
    //        Sub = Get("sub"),
    //        Email = Get("email") ?? Get("preferred_username"),
    //        EmailVerified = GetBool("email_verified"),
    //        Name = Get("name"),
    //        Picture = Get("picture"),
    //        Oid = Get("oid"),
    //        Tid = Get("tid"),
    //        PreferredUsername = Get("preferred_username")
    //    };
    //}

    private static AuthorizationService.Bff.OidcIdTokenPayload MapToPayload(ClaimsPrincipal p)
    {
        string? Get(string t) => p.FindFirstValue(t);
        string? GetAny(params string[] types) => types.Select(Get).FirstOrDefault(v => !string.IsNullOrEmpty(v));
        bool? GetBoolAny(params string[] types)
        {
            var v = GetAny(types);
            return bool.TryParse(v, out var b) ? b : null;
        }

        return new AuthorizationService.Bff.OidcIdTokenPayload
        {
            Sub = GetAny("sub", ClaimTypes.NameIdentifier),
            Email = GetAny("email", ClaimTypes.Email, "preferred_username"),
            EmailVerified = GetBoolAny("email_verified"),
            Name = GetAny("name", ClaimTypes.Name, "given_name"),
            Picture = GetAny("picture"), // Google keeps "picture" as-is
            Oid = GetAny("oid"),
            Tid = GetAny("tid"),
            PreferredUsername = GetAny("preferred_username")
        };
    }


    private async Task<IEnumerable<SecurityKey>> GetJwksAsync(string jwksUri)
    {
        if (_cache.TryGetValue(jwksUri, out IEnumerable<SecurityKey>? cached) && cached is not null)
            return cached;

        var client = _http.CreateClient(nameof(IdTokenValidator));
        using var resp = await client.GetAsync(jwksUri, HttpCompletionOption.ResponseHeadersRead);
        resp.EnsureSuccessStatusCode();

        var jwks = await resp.Content.ReadFromJsonAsync<JsonWebKeySet>();
        if (jwks is null || jwks.Keys.Count == 0)
            throw new InvalidOperationException("Empty JWKS.");

        var keys = jwks.Keys.Select(k => (SecurityKey)k).ToArray();
        _cache.Set(jwksUri, keys, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
        });
        return keys;
    }
}
