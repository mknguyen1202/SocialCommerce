using System.Security.Cryptography;

namespace AuthorizationService.Security;

/// <summary>URL-safe cryptographic random generator.</summary>
public static class CryptoRandom
{
    public static string CreateBase64Url(int numBytes)
    {
        var bytes = new byte[numBytes];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url(bytes);
    }

    public static string Base64Url(ReadOnlySpan<byte> data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
