using System.Security.Cryptography;
using System.Text;

namespace AuthorizationService.Oidc;

public interface IPkceService
{
    string GenerateCodeVerifier(int length = 64); // 43–128 chars per RFC 7636
    string CreateCodeChallenge(string codeVerifier); // S256
}

public sealed class PkceService : IPkceService
{
    public string GenerateCodeVerifier(int length = 64)
    {
        // URL-safe base64 without padding
        var bytes = new byte[length];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    public string CreateCodeChallenge(string codeVerifier)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.ASCII.GetBytes(codeVerifier);
        var hash = sha.ComputeHash(bytes);
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
