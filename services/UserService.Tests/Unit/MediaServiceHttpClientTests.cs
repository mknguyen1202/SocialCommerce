using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using UserService.Services;
using Xunit;

namespace UserService.Tests.Unit;

public class MediaServiceHttpClientTests
{
    [Fact]
    public async Task UploadAsync_Success_ReturnsMappedResultAndEscapedCategory()
    {
        const string json = "{\"mediaId\":\"f1e5f28e-9d0c-4d22-9976-64b0d03d7ec1\",\"url\":\"https://cdn.example.com/file.png\",\"thumbnailUrl\":\"https://cdn.example.com/thumb.png\"}";
        CapturingHandler handler = new CapturingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        HttpClient httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost:5100")
        };
        MediaServiceHttpClient sut = new MediaServiceHttpClient(httpClient);
        IFormFile file = MakeFormFile("avatar.png", "image/png", "dummy-image");

        MediaUploadResult result = await sut.UploadAsync(file, "avatar/banner");

        result.MediaId.Should().Be(Guid.Parse("f1e5f28e-9d0c-4d22-9976-64b0d03d7ec1"));
        result.Url.Should().Be("https://cdn.example.com/file.png");
        result.ThumbnailUrl.Should().Be("https://cdn.example.com/thumb.png");
        handler.LastRequest.Should().NotBeNull();
        handler.LastRequest!.Method.Should().Be(HttpMethod.Post);
        handler.LastRequest.RequestUri!.PathAndQuery.Should().Be("/media/upload?category=avatar%2Fbanner");
        handler.LastRequest.Content.Should().BeOfType<MultipartFormDataContent>();
    }

    [Fact]
    public async Task UploadAsync_NonSuccessStatus_ThrowsHttpRequestException()
    {
        CapturingHandler handler = new CapturingHandler(_ => new HttpResponseMessage(HttpStatusCode.BadRequest));
        HttpClient httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5100") };
        MediaServiceHttpClient sut = new MediaServiceHttpClient(httpClient);
        IFormFile file = MakeFormFile("avatar.png", "image/png", "dummy-image");

        Func<Task> act = async () => await sut.UploadAsync(file, "avatar");

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task UploadAsync_NullPayload_ThrowsInvalidOperationException()
    {
        CapturingHandler handler = new CapturingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("null", Encoding.UTF8, "application/json")
        });
        HttpClient httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5100") };
        MediaServiceHttpClient sut = new MediaServiceHttpClient(httpClient);
        IFormFile file = MakeFormFile("avatar.png", "image/png", "dummy-image");

        Func<Task> act = async () => await sut.UploadAsync(file, "avatar");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*empty response*");
    }

    private static IFormFile MakeFormFile(string fileName, string contentType, string body)
    {
        MemoryStream stream = new MemoryStream(Encoding.UTF8.GetBytes(body));
        FormFile formFile = new FormFile(stream, 0, stream.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
        return formFile;
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public CapturingHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            HttpResponseMessage response = _responder(request);
            return Task.FromResult(response);
        }
    }
}
