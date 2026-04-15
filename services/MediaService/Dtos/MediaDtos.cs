namespace MediaService.Dtos;

public sealed record MediaUploadResponseDto(
    Guid MediaId,
    string Url,
    string? ThumbnailUrl
);

public sealed record MediaMetaDto(
    Guid Id,
    Guid UploadedBy,
    string OriginalName,
    string ContentType,
    long SizeBytes,
    string PublicUrl,
    string? ThumbnailUrl,
    string Category,
    DateTimeOffset CreatedAt
);
