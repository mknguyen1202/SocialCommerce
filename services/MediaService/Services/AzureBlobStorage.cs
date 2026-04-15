using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace MediaService.Services;

/// <summary>Production blob storage backed by Azure Blob Storage.</summary>
public sealed class AzureBlobStorage : IBlobStorage
{
    private readonly BlobContainerClient _container;
    private readonly string _cdnBase;

    public AzureBlobStorage(IConfiguration config)
    {
        string connStr = config["AzureStorage:ConnectionString"]
            ?? throw new InvalidOperationException("AzureStorage:ConnectionString is required.");
        string container = config["AzureStorage:Container"] ?? "media";
        _cdnBase = config["AzureStorage:CdnBase"]?.TrimEnd('/') ?? string.Empty;
        _container = new BlobContainerClient(connStr, container);
    }

    public async Task<string> SaveAsync(string blobPath, Stream data, string contentType, CancellationToken ct = default)
    {
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);
        BlobClient blob = _container.GetBlobClient(blobPath);
        await blob.UploadAsync(data, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        return GetPublicUrl(blobPath);
    }

    public async Task DeleteAsync(string blobPath, CancellationToken ct = default)
    {
        BlobClient blob = _container.GetBlobClient(blobPath);
        await blob.DeleteIfExistsAsync(cancellationToken: ct);
    }

    public string GetPublicUrl(string blobPath) =>
        string.IsNullOrEmpty(_cdnBase)
            ? _container.GetBlobClient(blobPath).Uri.ToString()
            : $"{_cdnBase}/{blobPath}";
}
