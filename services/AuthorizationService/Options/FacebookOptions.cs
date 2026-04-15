namespace AuthorizationService.Options;

/// <remarks>Facebook is OAuth2 (not full OIDC). Typically no id_token; use access_token + Graph API.</remarks>
public sealed class FacebookOptions : ProviderOptions
{
    public FacebookOptions()
    {
        Name = "facebook";
        Authority = null;              // not used
        JwksUri = null;                // not used
        // Keep API versions in config so you can bump without code changes:
        AuthorizeEndpoint ??= "https://www.facebook.com/v20.0/dialog/oauth";
        TokenEndpoint ??= "https://graph.facebook.com/v20.0/oauth/access_token";
        ResponseMode ??= "query";
        Scopes ??= new[] { "public_profile", "email" }; // comma-separated at authorize call (provider code handles it)
    }
}
