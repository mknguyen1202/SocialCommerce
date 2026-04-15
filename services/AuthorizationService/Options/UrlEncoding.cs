using System.Net;

namespace AuthorizationService.Options;

public interface IUrlEncoder
{
    string Encode(string value);
    string EncodeComponent(string value);
}

public sealed class DefaultUrlEncoder : IUrlEncoder
{
    public string Encode(string value) => WebUtility.UrlEncode(value);
    public string EncodeComponent(string value) => Uri.EscapeDataString(value);
}
