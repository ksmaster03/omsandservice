using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Wms;

public sealed record WmsSyncLogDto(
    string Id,
    string Entity,
    string Action,
    SyncStatus Status,
    string RequestJson,
    string? ResponseJson,
    string? ErrorMsg,
    DateTime CreatedAt);

public sealed record WmsStockCacheDto(string Sku, string Warehouse, int Qty, DateTime UpdatedAt);
