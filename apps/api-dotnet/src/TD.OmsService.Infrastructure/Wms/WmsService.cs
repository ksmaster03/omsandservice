using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Wms;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// Read-only WMS observability surface. Active integration (sync-products,
/// scan-in/out, close-order, inventory-count) lives in the Node API and stays
/// there until the WMS spec stabilises — Phase 7 will revisit migration.
/// </summary>
public sealed class WmsService(AppDbContext db) : IWmsService
{
    public async Task<PagedResult<WmsSyncLogDto>> ListSyncLogsAsync(PageQuery q, CancellationToken ct)
    {
        var total = await db.WmsSyncLogs.CountAsync(ct);
        var items = await db.WmsSyncLogs.AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(l => new WmsSyncLogDto(l.Id, l.Entity, l.Action, l.Status, l.RequestJson, l.ResponseJson, l.ErrorMsg, l.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<WmsSyncLogDto>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<IReadOnlyList<WmsStockCacheDto>> StockCacheAsync(CancellationToken ct)
    {
        return await db.WmsStockCaches.AsNoTracking()
            .OrderBy(c => c.Sku)
            .Select(c => new WmsStockCacheDto(c.Sku, c.Warehouse, c.Qty, c.UpdatedAt))
            .ToListAsync(ct);
    }
}
