namespace UserService.Services;

public interface IMediaServiceClient
{
    Task<MediaUploadResult> UploadAsync(IFormFile file, string category);
}

public sealed record MediaUploadResult(Guid MediaId, string Url, string? ThumbnailUrl);
