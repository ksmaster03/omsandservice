namespace TD.OmsService.Application.Abstractions;

/// <summary>Mirrors lib/storage.ts kinds: installs, tickets, pm, feedback.</summary>
public enum UploadKind { Installs, Tickets, Pm, Feedback }

public sealed record StoredFile(string Key, string Url, long Size, string Mime);

public interface IFileStorageService
{
    Task<StoredFile> SaveAsync(UploadKind kind, string entityId, Stream content, string fileName, string contentType, CancellationToken ct = default);
    bool IsAllowedImage(string mime);
    bool IsAllowedVideo(string mime);
    bool IsAllowedFeedback(string mime);
}
