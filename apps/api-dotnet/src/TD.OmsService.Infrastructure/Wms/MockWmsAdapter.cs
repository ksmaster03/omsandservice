using TD.OmsService.Application.Wms;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// Default adapter when WMS_BASE_URL is not configured. Returns canned
/// data so dev/test environments don't need a live WMS reachable.
/// Mirrors apps/api/src/adapters/wms/mock-wms.ts.
/// </summary>
public sealed class MockWmsAdapter : IWmsAdapter
{
    public string Mode => "mock";

    public Task<bool> HealthCheckAsync(CancellationToken ct) => Task.FromResult(true);
    public Task<string?> GetVersionAsync(CancellationToken ct) => Task.FromResult<string?>("mock-1.0");

    public Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct)
    {
        IReadOnlyList<WmsPart> parts = new[]
        {
            new WmsPart(1, "R-MX-T100", "MAXNUM Treadmill T100", "EA", "Finished Goods"),
            new WmsPart(2, "C-GT-B200", "GORILLA TECK Bike B200", "EA", "Finished Goods"),
            new WmsPart(3, "FASCO-MOTOR-3HP", "Motor 3HP for Treadmill", "EA", "Spare Parts"),
        };
        return Task.FromResult(parts);
    }

    public Task<WmsStock?> GetStockAsync(string sku, CancellationToken ct) =>
        Task.FromResult<WmsStock?>(new WmsStock(sku, 10, "MAIN"));

    public Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct) =>
        Task.FromResult<object>(new { ok = true, container = req.ContainerId, location = req.LocationCode, mode = "mock" });

    public Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct) =>
        Task.FromResult<object>(new { ok = true, container = req.ContainerId, orderNo = req.OrderNo, mode = "mock" });

    public Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct) =>
        Task.FromResult<object>(new { ok = true, orderNo = req.OrderNo, mode = "mock" });

    public Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct) =>
        Task.FromResult<object>(new { ok = true, profileId = req.ProfileId, counted = req.Lines.Count, mode = "mock" });
}
