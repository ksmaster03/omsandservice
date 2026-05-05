using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Wms;

public interface IWmsService
{
    Task<PagedResult<WmsSyncLogDto>> ListSyncLogsAsync(PageQuery q, CancellationToken ct);
    Task<IReadOnlyList<WmsStockCacheDto>> StockCacheAsync(CancellationToken ct);
}
