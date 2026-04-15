namespace UserService.Auth.External.Apple;

public sealed class AppleOptions
{
    // AKA "Service ID" for web, or App ID for native, depending on flow.
    public string ClientId { get; init; } = default!;
    public string TeamId { get; init; } = default!;
    public string KeyId { get; init; } = default!;
    // Path to your .p8 private key (PKCS#8). Example: "Keys/AuthKey_ABC123.p8"
    public string PrivateKeyPath { get; init; } = default!;
    // How long the Apple client_secret should live (max ~6 months)
    public int ClientSecretDays { get; init; } = 150;
}
