namespace UserService.Auth.Abstractions
{
    public sealed record ExternalUserInfo(
        string Provider,          // "Google"
        string ProviderKey,       // stable subject/id from provider
        string? Email,
        string? Name,
        string? PictureUrl,
        IReadOnlyDictionary<string, string> RawClaims);
}
