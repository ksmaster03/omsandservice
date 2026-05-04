using Microsoft.Extensions.Configuration;
using TD.OmsService.Application.Abstractions;

namespace TD.OmsService.Infrastructure.Storage;

/// <summary>
/// Local-disk implementation that mirrors lib/storage.ts behavior:
/// uploads/{kind}/{entityId}/{uuid}.{ext} with mime allowlist per kind.
/// Swap for S3/MinIO in production by binding a different IFileStorageService.
/// </summary>
public sealed class LocalFileStorageService : IFileStorageService
{
    private static readonly HashSet<string> AllowedImage = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp",
    };

    private static readonly HashSet<string> AllowedVideo = new(StringComparer.OrdinalIgnoreCase)
    {
        "video/mp4", "video/quicktime", "video/webm",
    };

    private static readonly HashSet<string> AllowedFeedback = new(AllowedImage, StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
    };

    private readonly string _root;

    public LocalFileStorageService(IConfiguration config)
    {
        var rel = config["Storage:UploadRoot"] ?? "uploads";
        _root = Path.IsPathRooted(rel) ? rel : Path.Combine(Directory.GetCurrentDirectory(), rel);
        Directory.CreateDirectory(_root);
    }

    public bool IsAllowedImage(string mime) => AllowedImage.Contains(mime);
    public bool IsAllowedVideo(string mime) => AllowedVideo.Contains(mime);
    public bool IsAllowedFeedback(string mime) => AllowedFeedback.Contains(mime);

    public async Task<StoredFile> SaveAsync(UploadKind kind, string entityId, Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        var ext = ExtensionFor(contentType, fileName);
        var dir = Path.Combine(_root, kind.ToString().ToLowerInvariant(), entityId);
        Directory.CreateDirectory(dir);

        var key = $"{kind.ToString().ToLowerInvariant()}/{entityId}/{Guid.NewGuid():N}.{ext}";
        var full = Path.Combine(_root, key.Replace('/', Path.DirectorySeparatorChar));

        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        var size = fs.Position;

        return new StoredFile(key, "/uploads/" + key, size, contentType);
    }

    private static string ExtensionFor(string mime, string fileName)
    {
        var byMime = mime.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/jpg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "video/mp4" => "mp4",
            "video/quicktime" => "mov",
            "video/webm" => "webm",
            "application/pdf" => "pdf",
            _ => null,
        };
        if (byMime is not null) return byMime;
        var fromName = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        return string.IsNullOrEmpty(fromName) ? "bin" : fromName;
    }
}
