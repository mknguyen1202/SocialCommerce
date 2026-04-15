using System.Text.Json.Serialization;

namespace AuthorizationService.Oidc;

public sealed class AuthorizeRequest
{
    public required string CodeChallenge { get; init; }
    public required string CodeChallengeMethod { get; init; } // "S256"
    public required string State { get; init; }
    public required string Nonce { get; init; }
    public IDictionary<string, string>? ExtraParameters { get; init; }
}

public sealed class TokenExchangeRequest
{
    public required string Code { get; init; }
    public required string CodeVerifier { get; init; }
}

public sealed class TokenExchangeResult
{
    public bool Success { get; init; }
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }
    public string? IdToken { get; init; }
    public int? ExpiresInSeconds { get; init; }
    public string? Scope { get; init; }
    public string? Error { get; init; }

    public static TokenExchangeResult Fail(string err) => new() { Success = false, Error = err };
    public static TokenExchangeResult Ok(string? access, string? refresh, string? id, int? exp, string? scope)
        => new() { Success = true, AccessToken = access, RefreshToken = refresh, IdToken = id, ExpiresInSeconds = exp, Scope = scope };
}

public sealed class IdTokenValidationResult
{
    public bool Success { get; init; }
    public AuthorizationService.Bff.OidcIdTokenPayload? Payload { get; init; }
    public string? Error { get; init; }

    public static IdTokenValidationResult Ok(AuthorizationService.Bff.OidcIdTokenPayload payload) => new() { Success = true, Payload = payload };
    public static IdTokenValidationResult Fail(string err) => new() { Success = false, Error = err };
}
