using System.ComponentModel.DataAnnotations;

namespace AuthorizationService.Options;

/// <summary>Sign in with Apple requires a JWT client secret signed with your .p8 key.</summary>
public sealed class AppleOptions : ProviderOptions
{
    /// <summary>Your Apple Developer Team ID (iss in the client secret).</summary>
    [Required] public string? TeamId { get; set; }

    /// <summary>Key ID of the .p8 private key.</summary>
    [Required] public string? KeyId { get; set; }

    /// <summary>The .p8 private key PEM (store in Key Vault / env var, not in appsettings).</summary>
    [Required] public string? P8PrivateKeyPem { get; set; }

    /// <summary>Lifetime in minutes for the generated client secret (max 6 months).</summary>
    public int ClientSecretLifetimeMinutes { get; set; } = 15;

    public AppleOptions()
    {
        Name = "apple";
        Authority ??= "https://appleid.apple.com";
        AuthorizeEndpoint ??= "https://appleid.apple.com/auth/authorize";
        TokenEndpoint ??= "https://appleid.apple.com/auth/token";
        JwksUri ??= "https://appleid.apple.com/auth/keys";
        ResponseMode ??= "form_post";
        Scopes ??= new[] { "name", "email" };
    }
}
