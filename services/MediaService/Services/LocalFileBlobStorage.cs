namespace MediaService.Services;

/// <summary>
/// Dev-only blob storage: saves files to {contentRoot}/uploads/ and serves
/// them via the static files middleware at /uploads/*.
/// </summary>
public sealed class LocalFileBlobStorage : IBlobStorage
{
    private readonly string _root;
    private readonly string _baseUrl;

    public LocalFileBlobStorage(IWebHostEnvironment env, IConfiguration config)
    {
        _root = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(_root);
        _baseUrl = config["MediaService:LocalBaseUrl"]?.TrimEnd('/') ?? "http://localhost:5006";
    }

    public async Task<string> SaveAsync(string blobPath, Stream data, string contentType, CancellationToken ct = default)
    {
        string fullPath = Path.Combine(_root, blobPath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using FileStream fs = File.Create(fullPath);
        await data.CopyToAsync(fs, ct);
        return GetPublicUrl(blobPath);
    }

    public Task DeleteAsync(string blobPath, CancellationToken ct = default)
    {
        string fullPath = Path.Combine(_root, blobPath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string blobPath) => $"{_baseUrl}/uploads/{blobPath}";
}
