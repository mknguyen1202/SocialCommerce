using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace AuthorizationService.Infrastructure.HttpClients;

public interface IProviderHttpClient
{
    Task<HttpResponseMessage> PostFormAsync(string url, IDictionary<string, string> form, CancellationToken ct = default);
    Task<HttpResponseMessage> GetAsync(string url, CancellationToken ct = default);
}

/// <summary>
/// Typed HttpClient wrapper for calling OAuth/OIDC providers with consistent headers,
/// short timeouts, and a minimal retry on transient 5xx/429.
/// </summary>
public sealed class ProviderHttpClient : IProviderHttpClient
{
    private readonly HttpClient _http;

    public ProviderHttpClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(15);
        if (!_http.DefaultRequestHeaders.UserAgent.Any())
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("AuthorizationService/1.0");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public Task<HttpResponseMessage> GetAsync(string url, CancellationToken ct = default)
        => SendWithRetryAsync(() => new HttpRequestMessage(HttpMethod.Get, url), ct);

    public Task<HttpResponseMessage> PostFormAsync(string url, IDictionary<string, string> form, CancellationToken ct = default)
        => SendWithRetryAsync(() =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new FormUrlEncodedContent(form)
            };
            req.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded")
            {
                CharSet = Encoding.UTF8.WebName
            };
            return req;
        }, ct);

    private async Task<HttpResponseMessage> SendWithRetryAsync(Func<HttpRequestMessage> build, CancellationToken ct)
    {
        const int maxAttempts = 3;
        var delay = TimeSpan.FromMilliseconds(200);

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = build();
            HttpResponseMessage? resp = null;
            try
            {
                resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
                if (!IsTransient(resp.StatusCode)) return resp;
                if (attempt == maxAttempts) return resp;
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                // transient network
            }

            resp?.Dispose();
            await Task.Delay(delay, ct);
            delay = TimeSpan.FromMilliseconds(delay.TotalMilliseconds * 2); // backoff
        }

        // unreachable
        throw new InvalidOperationException("Retry loop fell through unexpectedly.");
    }

    private static bool IsTransient(HttpStatusCode code)
        => code == HttpStatusCode.TooManyRequests || ((int)code >= 500 && (int)code < 600);
}
