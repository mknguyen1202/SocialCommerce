namespace AuthorizationService.Options;

public sealed class MicrosoftOptions : ProviderOptions
{
    /// <summary>Tenant id ("common", "organizations", "consumers", or a GUID) should be encoded in the endpoints configured.</summary>
    public string? TenantHint { get; set; }

    public MicrosoftOptions()
    {
        Name = "microsoft";
        Authority ??= "https://login.microsoftonline.com/common/v2.0";
        AuthorizeEndpoint ??= "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
        TokenEndpoint ??= "https://login.microsoftonline.com/common/oauth2/v2.0/token";
        JwksUri ??= "https://login.microsoftonline.com/common/discovery/v2.0/keys";
        ResponseMode ??= "query";
        Scopes ??= new[] { "openid", "email", "profile" };
    }
}
