using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using TD.OmsService.Application.Abstractions;

namespace TD.OmsService.Infrastructure.Storage;

/// <summary>
/// AWS S3 backend for IFileStorageService. Same key shape as the local-disk
/// version (`{kind}/{entityId}/{uuid}.{ext}`) so URLs stay portable across
/// environments.
///
/// Configuration:
///   Storage:Backend       = "s3"
///   Storage:S3:Bucket     = required (e.g. "td-oms-uploads-prod")
///   Storage:S3:Region     = required (e.g. "ap-southeast-7")
///   Storage:S3:UrlPrefix  = optional CDN/CloudFront base for the returned URL
///                           (defaults to "https://{bucket}.s3.{region}.amazonaws.com")
///   Storage:S3:CannedAcl  = optional ("private" default; set "public-read" for
///                           buckets fronted by CloudFront with public access)
///
/// Credentials are picked up via the AWS SDK default chain (env vars,
/// ~/.aws/credentials, or EC2/ECS instance profile) — no secrets in config.
/// </summary>
public sealed class S3FileStorageService : IFileStorageService, IDisposable
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

    private readonly IAmazonS3 _client;
    private readonly string _bucket;
    private readonly string _urlPrefix;
    private readonly S3CannedACL _cannedAcl;

    public S3FileStorageService(IConfiguration config)
    {
        _bucket = config["Storage:S3:Bucket"]
            ?? throw new InvalidOperationException("Storage:S3:Bucket is required when Storage:Backend=s3");
        var region = config["Storage:S3:Region"]
            ?? throw new InvalidOperationException("Storage:S3:Region is required when Storage:Backend=s3");

        _client = new AmazonS3Client(RegionEndpoint.GetBySystemName(region));

        _urlPrefix = (config["Storage:S3:UrlPrefix"] ?? $"https://{_bucket}.s3.{region}.amazonaws.com").TrimEnd('/');

        var aclName = config["Storage:S3:CannedAcl"] ?? "private";
        _cannedAcl = aclName.Equals("public-read", StringComparison.OrdinalIgnoreCase)
            ? S3CannedACL.PublicRead
            : S3CannedACL.Private;
    }

    public bool IsAllowedImage(string mime) => AllowedImage.Contains(mime);
    public bool IsAllowedVideo(string mime) => AllowedVideo.Contains(mime);
    public bool IsAllowedFeedback(string mime) => AllowedFeedback.Contains(mime);

    public async Task<StoredFile> SaveAsync(UploadKind kind, string entityId, Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        var ext = ExtensionFor(contentType, fileName);
        var key = $"{kind.ToString().ToLowerInvariant()}/{entityId}/{Guid.NewGuid():N}.{ext}";

        var put = new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType,
            CannedACL = _cannedAcl,
            AutoCloseStream = false,
        };
        // ServerSideEncryption defaults to bucket-level config; explicit AES256 here
        // is a belt-and-braces guarantee even if the bucket policy is reset.
        put.ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256;

        await _client.PutObjectAsync(put, ct);

        // PutObjectAsync consumes the stream — read length from the original
        // (caller passed a seekable stream from IFormFile.OpenReadStream).
        var size = content.CanSeek ? content.Length : 0L;

        return new StoredFile(key, $"{_urlPrefix}/{key}", size, contentType);
    }

    public void Dispose() => _client.Dispose();

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
