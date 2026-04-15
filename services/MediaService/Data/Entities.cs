using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MediaService.Data;

[Table("MediaAssets")]
[Index(nameof(UploadedBy))]
[Index(nameof(CreatedAt))]
public class MediaAsset
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UploadedBy { get; set; }

    [MaxLength(512)]
    public string OriginalName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    [MaxLength(1024)]
    public string BlobPath { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string PublicUrl { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string? ThumbnailUrl { get; set; }

    /// <summary>avatar | attachment | post | theater | product</summary>
    [MaxLength(20)]
    public string Category { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsDeleted { get; set; }
}
