using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace UserService.Services;

public sealed class MediaServiceHttpClient : IMediaServiceClient
{
    private readonly HttpClient _http;

    public MediaServiceHttpClient(HttpClient http) => _http = http;

    public async Task<MediaUploadResult> UploadAsync(IFormFile file, string category)
    {
        using MultipartFormDataContent content = new MultipartFormDataContent();
        StreamContent streamContent = new StreamContent(file.OpenReadStream());
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
        content.Add(streamContent, "file", file.FileName);

        HttpResponseMessage response = await _http.PostAsync($"/media/upload?category={Uri.EscapeDataString(category)}", content);
        response.EnsureSuccessStatusCode();

        string json = await response.Content.ReadAsStringAsync();
        MediaUploadResponse result = JsonSerializer.Deserialize<MediaUploadResponse>(json, _jsonOptions)
            ?? throw new InvalidOperationException("MediaService returned an empty response.");

        return new MediaUploadResult(result.MediaId, result.Url, result.ThumbnailUrl);
    }

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private sealed record MediaUploadResponse(
        [property: JsonPropertyName("mediaId")] Guid MediaId,
        [property: JsonPropertyName("url")] string Url,
        [property: JsonPropertyName("thumbnailUrl")] string? ThumbnailUrl
    );
}
