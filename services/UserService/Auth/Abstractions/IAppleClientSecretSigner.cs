namespace UserService.Auth.Abstractions
{
    public interface IAppleClientSecretSigner
    {
        string CreateClientSecret(string teamId, string keyId, string clientId, string privateKeyPem, TimeSpan lifetime);
    }
}
