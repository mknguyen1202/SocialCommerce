using MediaService.Data;
using MediaService.Dtos;

namespace MediaService.Services;

public interface IMediaUploadService
{
    Task<MediaUploadResponseDto> UploadAsync(IFormFile file, Guid uploadedBy, string category, CancellationToken ct = default);
}

public sealed class MediaUploadService : IMediaUploadService
{
    private static readonly HashSet<string> _allowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/webm",
        "audio/mpeg", "audio/ogg", "audio/wav",
        "application/pdf"
    };

    private static readonly Dictionary<string, string> _extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/gif"] = ".gif",
        ["image/webp"] = ".webp", ["video/mp4"] = ".mp4", ["video/webm"] = ".webm",
        ["audio/mpeg"] = ".mp3", ["audio/ogg"] = ".ogg", ["audio/wav"] = ".wav",
        ["application/pdf"] = ".pdf"
    };

    private const long MaxBytes = 100 * 1024 * 1024; // 100 MB

    private readonly IBlobStorage _blob;
    private readonly AppDbContext _db;

    public MediaUploadService(IBlobStorage blob, AppDbContext db)
    {
        _blob = blob;
        _db = db;
    }

    public async Task<MediaUploadResponseDto> UploadAsync(
        IFormFile file, Guid uploadedBy, string category, CancellationToken ct = default)
    {
        if (file.Length == 0) throw new ArgumentException("File is empty.");
        if (file.Length > MaxBytes) throw new ArgumentException($"File exceeds the 100 MB limit.");
        if (!_allowedMimeTypes.Contains(file.ContentType))
            throw new ArgumentException($"Content type '{file.ContentType}' is not allowed.");

        string ext = _extensions.TryGetValue(file.ContentType, out string? e) ? e : Path.GetExtension(file.FileName);
        Guid id = Guid.NewGuid();
        string blobPath = $"{category}/{id:N}{ext}";

        await using Stream stream = file.OpenReadStream();
        string publicUrl = await _blob.SaveAsync(blobPath, stream, file.ContentType, ct);

        MediaAsset asset = new MediaAsset
        {
            Id = id,
            UploadedBy = uploadedBy,
            OriginalName = file.FileName,
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            BlobPath = blobPath,
            PublicUrl = publicUrl,
            Category = category,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.MediaAssets.Add(asset);
        await _db.SaveChangesAsync(ct);

        return new MediaUploadResponseDto(asset.Id, publicUrl, null);
    }
}
