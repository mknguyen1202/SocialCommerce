namespace UserService.Auth.External.Google;

public sealed class GoogleOptions
{
    public string ClientId { get; init; } = default!;
    public string ClientSecret { get; init; } = default!;
    // Optional: extra scopes beyond "openid email profile"
    public string[] ExtraScopes { get; init; } = Array.Empty<string>();
}
