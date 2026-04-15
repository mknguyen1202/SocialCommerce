namespace AuthorizationService.Oidc;

public interface IProvider
{
    string Name { get; }
    string ClientId { get; }
    string? ClientSecret { get; } // may be null (e.g., Apple uses dynamic secret generation)
    string AuthorizeEndpoint { get; }
    string TokenEndpoint { get; }
    string? JwksUri { get; }
    string? Authority { get; } // expected issuer

    /// Builds the browser redirect URL for the authorization request.
    string BuildAuthorizeUrl(AuthorizeRequest request);

    /// Builds provider-specific token request body (authorization_code or refresh_token).
    Task<Dictionary<string, string>> BuildTokenRequestAsync(ProviderTokenBuildArgs args);
}

public sealed class ProviderTokenBuildArgs
{
    public required string GrantType { get; init; } // "authorization_code" or "refresh_token"
    public string? Code { get; init; }
    public string? CodeVerifier { get; init; }
    public string? RefreshToken { get; init; }
}
