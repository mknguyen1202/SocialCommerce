using System.ComponentModel.DataAnnotations;

namespace AuthorizationService.Options;

/// <summary>Common fields every OAuth/OIDC provider option shares.</summary>
public abstract class ProviderOptions
{
    /// <summary>Display name / registry key (e.g., "google"). Used only for diagnostics.</summary>
    public string? Name { get; set; }

    [Required] public string? ClientId { get; set; }
    /// <summary>May be null (e.g., pure-PKCE flows or Apple which builds a JWT at runtime).</summary>
    public string? ClientSecret { get; set; }

    /// <summary>Authorize endpoint (absolute URL).</summary>
    [Required] public string? AuthorizeEndpoint { get; set; }

    /// <summary>Token endpoint (absolute URL).</summary>
    [Required] public string? TokenEndpoint { get; set; }

    /// <summary>JWKS URI for ID-token validation (null for non-OIDC providers).</summary>
    public string? JwksUri { get; set; }

    /// <summary>Expected issuer ('iss') for ID tokens (if OIDC).</summary>
    public string? Authority { get; set; }

    /// <summary>Redirect URI registered with the provider.</summary>
    [Required] public string? RedirectUri { get; set; }

    /// <summary>Requested scopes.</summary>
    public string[]? Scopes { get; set; }

    /// <summary>OIDC response_mode override (e.g., "query", "form_post").</summary>
    public string? ResponseMode { get; set; }

    /// <summary>Provider UX hint (e.g., "consent", "login").</summary>
    public string? Prompt { get; set; }
}
