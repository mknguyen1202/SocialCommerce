using System.Net.Http.Headers;
using System.Text.Json;

namespace AuthorizationService.Oidc;

public interface ITokenExchangeService
{
    Task<TokenExchangeResult> RedeemCodeAsync(IProvider provider, TokenExchangeRequest request);
    Task<TokenExchangeResult> RefreshAsync(IProvider provider, string refreshToken);
}

public sealed class TokenExchangeService : ITokenExchangeService
{
    private readonly IHttpClientFactory _http;

    public TokenExchangeService(IHttpClientFactory http)
    {
        _http = http;
    }

    public async Task<TokenExchangeResult> RedeemCodeAsync(IProvider provider, TokenExchangeRequest request)
    {
        var body = await provider.BuildTokenRequestAsync(new ProviderTokenBuildArgs
        {
            GrantType = "authorization_code",
            Code = request.Code,
            CodeVerifier = request.CodeVerifier
        });

        return await SendAsync(provider, body);
    }

    public async Task<TokenExchangeResult> RefreshAsync(IProvider provider, string refreshToken)
    {
        var body = await provider.BuildTokenRequestAsync(new ProviderTokenBuildArgs
        {
            GrantType = "refresh_token",
            RefreshToken = refreshToken
        });

        return await SendAsync(provider, body);
    }

    private async Task<TokenExchangeResult> SendAsync(IProvider provider, Dictionary<string, string> form)
    {
        var client = _http.CreateClient(nameof(TokenExchangeService));
        using var req = new HttpRequestMessage(HttpMethod.Post, provider.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(form)
        };
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);
        var content = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            return TokenExchangeResult.Fail($"HTTP {(int)resp.StatusCode}: {content}");

        try
        {
            var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            string? access = root.TryGetProperty("access_token", out var at) ? at.GetString() : null;
            string? refresh = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
            string? id = root.TryGetProperty("id_token", out var it) ? it.GetString() : null;
            int? exp = root.TryGetProperty("expires_in", out var ei) ? ei.GetInt32() : null;
            string? scope = root.TryGetProperty("scope", out var sc) ? sc.GetString() : null;

            return TokenExchangeResult.Ok(access, refresh, id, exp, scope);
        }
        catch (Exception ex)
        {
            return TokenExchangeResult.Fail($"Parse error: {ex.Message}");
        }
    }
}
