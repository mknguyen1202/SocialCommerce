namespace MediaService.Services;

public interface IBlobStorage
{
    /// <summary>Saves a stream to blob storage under the given path and returns the public URL.</summary>
    Task<string> SaveAsync(string blobPath, Stream data, string contentType, CancellationToken ct = default);

    /// <summary>Soft-deletes a blob (or marks it for eventual cleanup).</summary>
    Task DeleteAsync(string blobPath, CancellationToken ct = default);

    /// <summary>Builds the public-facing URL for an existing blob path.</summary>
    string GetPublicUrl(string blobPath);
}
