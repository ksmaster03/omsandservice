using System.Text.Json;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// Wraps a WMS adapter call with audit-trail persistence (mirrors logSync()
/// in apps/api/src/lib/wms.ts). Every push/pull writes a row to WmsSyncLog so
/// reviewers can replay traffic when something goes sideways.
/// </summary>
public static class WmsSyncLogger
{
    public static async Task<T> LogAsync<T>(
        AppDbContext db,
        string entity,
        string action,
        object request,
        Func<Task<T>> call,
        CancellationToken ct)
    {
        var log = new WmsSyncLog
        {
            Id = Guid.NewGuid().ToString(),
            Entity = entity,
            Action = action,
            RequestJson = JsonSerializer.Serialize(request),
            Status = SyncStatus.PENDING,
            CreatedAt = DateTime.UtcNow,
        };
        db.WmsSyncLogs.Add(log);
        await db.SaveChangesAsync(ct);

        try
        {
            var result = await call();
            log.ResponseJson = JsonSerializer.Serialize(result);
            log.Status = SyncStatus.SUCCESS;
            await db.SaveChangesAsync(ct);
            return result;
        }
        catch (Exception ex)
        {
            log.Status = SyncStatus.FAILED;
            log.ErrorMsg = ex.Message;
            await db.SaveChangesAsync(ct);
            throw;
        }
    }
}
