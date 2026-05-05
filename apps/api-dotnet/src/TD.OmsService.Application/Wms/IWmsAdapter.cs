namespace TD.OmsService.Application.Wms;

/// <summary>
/// Active WMS integration shapes — kept minimal to match the Node API contract
/// during migration. The full WMS DTO surface (parts, warehouses, locations,
/// receipts, containers, truckloads, invoices) ports as the spec stabilises;
/// these are the operations that the .NET controllers expose today.
/// </summary>
public sealed record WmsPart(int Id, string Name, string? Description, string? Uom, string? PartTypeName);

public sealed record WmsStock(string Sku, int Qty, string? Warehouse);

public sealed record SyncProductsRequest(string Mode, string? Filter); // mode: "preview" | "confirm"

public sealed record SyncProductSummary(int TotalWms, int Filtered, int Matched, int Linked, int ToCreate, int Created);

public sealed record SyncProductResult(int WmsId, string WmsSku, string WmsName, string Status, string? LocalProductId, string? LocalSku, string? DetectedBrand, string? DetectedCategory);

public sealed record SyncProductsResponse(string Mode, SyncProductSummary Summary, IReadOnlyList<SyncProductResult> Results);

public sealed record ScanInRequest(string ContainerId, string LocationCode);
public sealed record ScanOutRequest(string ContainerId, string OrderNo);
public sealed record CloseOrderRequest(string OrderNo);
public sealed record InventoryCountRequest(int ProfileId, IReadOnlyList<InventoryCountLine> Lines);
public sealed record InventoryCountLine(string Sku, int CountedQty);

public sealed record WmsAdapterMode(string Mode, bool Connected, string? Version);

public interface IWmsAdapter
{
    string Mode { get; } // "live" | "mock"
    Task<bool> HealthCheckAsync(CancellationToken ct);
    Task<string?> GetVersionAsync(CancellationToken ct);
    Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct);
    Task<WmsStock?> GetStockAsync(string sku, CancellationToken ct);
    Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct);
    Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct);
    Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct);
    Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct);
}
