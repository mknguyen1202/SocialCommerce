using System.ComponentModel.DataAnnotations;

namespace AuthorizationService.Options;

public sealed class GoogleOptions : ProviderOptions
{
    /// <summary>For refresh tokens: set to "offline".</summary>
    public string? AccessType { get; set; } // "offline"

    public GoogleOptions()
    {
        Name = "google";
        Authority = Authority ?? "https://accounts.google.com";
        AuthorizeEndpoint ??= "https://accounts.google.com/o/oauth2/v2/auth";
        TokenEndpoint ??= "https://oauth2.googleapis.com/token";
        JwksUri ??= "https://www.googleapis.com/oauth2/v3/certs";
        ResponseMode ??= "query";
        Scopes ??= new[] { "openid", "email", "profile" };
    }
}
