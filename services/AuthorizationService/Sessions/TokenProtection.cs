using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;

namespace AuthorizationService.Sessions;

public interface ITokenProtector
{
    string Protect(ProviderTokenRecord tokens);
    ProviderTokenRecord Unprotect(string protectedPayload);
}

public sealed class DataProtectionTokenProtector : ITokenProtector
{
    private readonly IDataProtector _protector;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public DataProtectionTokenProtector(IDataProtectionProvider dp)
    {
        _protector = dp.CreateProtector("AuthorizationService.StoredTokens.v1");
    }

    public string Protect(ProviderTokenRecord tokens)
    {
        string json = JsonSerializer.Serialize(tokens, _json);
        return _protector.Protect(json);
    }

    public ProviderTokenRecord Unprotect(string protectedPayload)
    {
        string json = _protector.Unprotect(protectedPayload);
        ProviderTokenRecord? obj = JsonSerializer.Deserialize<ProviderTokenRecord>(json, _json);
        if (obj is null) throw new InvalidOperationException("Failed to deserialize stored tokens.");
        return obj;
    }
}
