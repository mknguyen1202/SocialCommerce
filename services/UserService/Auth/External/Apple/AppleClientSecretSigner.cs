using System.Formats.Asn1;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using UserService.Auth.Abstractions;

namespace UserService.Auth.External.Apple;

public sealed class AppleClientSecretSigner : IAppleClientSecretSigner
{
    public string CreateClientSecret(string teamId, string keyId, string clientId, string privateKeyPem, TimeSpan lifetime)
    {
        // Apple requires ES256: ECDSA w/ P-256 + SHA-256  
        using ECDsa ecdsa = LoadEcdsaFromPkcs8Pem(privateKeyPem);
        SigningCredentials creds = new SigningCredentials(new ECDsaSecurityKey(ecdsa) { KeyId = keyId }, SecurityAlgorithms.EcdsaSha256);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        JwtSecurityToken token = new JwtSecurityToken(
            issuer: teamId,                                   // "iss": Team ID  
            audience: "https://appleid.apple.com",           // "aud"  
            claims: new[] { new System.Security.Claims.Claim("sub", clientId) },
            notBefore: now.UtcDateTime,
            expires: now.Add(lifetime).UtcDateTime,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static ECDsa LoadEcdsaFromPkcs8Pem(string pem)
    {
        // Accept either raw PEM or file path  
        if (System.IO.File.Exists(pem))
            pem = System.IO.File.ReadAllText(pem);

        // Strip PEM headers  
        string header = "-----BEGIN PRIVATE KEY-----";
        string footer = "-----END PRIVATE KEY-----";
        int start = pem.IndexOf(header, StringComparison.Ordinal);
        int end = pem.IndexOf(footer, StringComparison.Ordinal);
        if (start >= 0 && end > start)
        {
            string b64 = pem.Substring(start + header.Length, end - (start + header.Length))
                        .Replace("\r", "").Replace("<br />", "").Trim();
            byte[] der = Convert.FromBase64String(b64);
            ECDsa ecdsa = ECDsa.Create();
            ecdsa.ImportPkcs8PrivateKey(der, out _);
            return ecdsa;
        }

        // If it's already base64 DER  
        try
        {
            byte[] der = Convert.FromBase64String(pem.Trim());
            ECDsa ecdsa = ECDsa.Create();
            ecdsa.ImportPkcs8PrivateKey(der, out _);
            return ecdsa;
        }
        catch
        {
            throw new InvalidOperationException("Apple private key must be PKCS#8 (.p8) PEM or base64 DER.");
        }
    }
}
