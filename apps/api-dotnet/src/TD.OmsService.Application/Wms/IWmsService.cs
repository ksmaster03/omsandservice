using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Wms;

public interface IWmsService
{
    // Phase 6 read-only
    Task<PagedResult<WmsSyncLogDto>> ListSyncLogsAsync(PageQuery q, CancellationToken ct);
    Task<IReadOnlyList<WmsStockCacheDto>> StockCacheAsync(CancellationToken ct);

    // Active integration (newly ported — were on Node before)
    Task<WmsAdapterMode> StatusAsync(CancellationToken ct);
    Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct);
    Task<SyncProductsResponse> SyncProductsAsync(SyncProductsRequest req, CancellationToken ct);
    Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct);
    Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct);
    Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct);
    Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct);
}
