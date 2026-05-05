using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Wms;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// Active WMS integration ported from apps/api/src/routes/wms.ts. The 5 active
/// endpoints (sync-products, scan-in, scan-out, close-order, inventory-count)
/// are now in .NET; the read-only observability surface (sync-logs, stock-cache)
/// from Phase 6 is preserved. Brand + category detection from product
/// description/SKU mirrors the Node logic exactly.
/// </summary>
public sealed class WmsService(AppDbContext db, IWmsAdapter wms) : IWmsService
{
    private static readonly Dictionary<string, Brand> BrandMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["gorilla teck"] = Brand.GORILLA_TECK,
        ["maxnum"] = Brand.MAXNUM,
        ["impulse"] = Brand.IMPULSE,
        ["anyfit"] = Brand.ANYFIT,
    };

    private static readonly Dictionary<string, string> CategoryMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["R"] = "Treadmill",
        ["C"] = "Bike",
        ["W"] = "Elliptical",
        ["SM"] = "Strength Machine",
        ["FASCO"] = "Motor/Parts",
    };

    // ── Phase 6 read-only ───────────────────────────────────
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

    public async Task<IReadOnlyList<WmsStockCacheDto>> StockCacheAsync(CancellationToken ct) =>
        await db.WmsStockCaches.AsNoTracking()
            .OrderBy(c => c.Sku)
            .Select(c => new WmsStockCacheDto(c.Sku, c.Warehouse, c.Qty, c.UpdatedAt))
            .ToListAsync(ct);

    // ── Active integration ──────────────────────────────────
    public async Task<WmsAdapterMode> StatusAsync(CancellationToken ct)
    {
        var ok = await wms.HealthCheckAsync(ct);
        var version = ok ? await wms.GetVersionAsync(ct) : null;
        return new WmsAdapterMode(wms.Mode, ok, version);
    }

    public Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct) =>
        WmsSyncLogger.LogAsync(db, "parts", "pull", new { }, () => wms.GetPartsAsync(ct), ct);

    public async Task<SyncProductsResponse> SyncProductsAsync(SyncProductsRequest req, CancellationToken ct)
    {
        if (req.Mode != "preview" && req.Mode != "confirm")
            throw new ArgumentException("mode must be 'preview' or 'confirm'", nameof(req));

        var wmsParts = await WmsSyncLogger.LogAsync(db, "sync_products", "pull", req, () => wms.GetPartsAsync(ct), ct);

        var prefixes = string.IsNullOrWhiteSpace(req.Filter)
            ? Array.Empty<string>()
            : req.Filter.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(p => p.ToUpperInvariant()).ToArray();
        var filtered = prefixes.Length == 0
            ? (IReadOnlyList<WmsPart>)wmsParts
            : wmsParts.Where(p => prefixes.Any(pfx => (p.Name ?? string.Empty).StartsWith(pfx, StringComparison.OrdinalIgnoreCase))).ToList();

        var results = new List<SyncProductResult>(filtered.Count);

        foreach (var part in filtered)
        {
            var wmsSku = part.Name ?? string.Empty;
            var wmsDesc = part.Description ?? string.Empty;

            var local = await db.Products.FirstOrDefaultAsync(p => p.WmsPartNo == wmsSku, ct)
                        ?? await db.Products.FirstOrDefaultAsync(p => p.Sku == wmsSku, ct);

            if (local is not null)
            {
                if (string.IsNullOrEmpty(local.WmsPartNo))
                {
                    if (req.Mode == "confirm")
                    {
                        local.WmsPartNo = wmsSku;
                        local.UpdatedAt = DateTime.UtcNow;
                        await db.SaveChangesAsync(ct);
                        results.Add(new SyncProductResult(part.Id, wmsSku, wmsDesc, "linked", local.Id, local.Sku, null, null));
                    }
                    else
                    {
                        results.Add(new SyncProductResult(part.Id, wmsSku, wmsDesc, "matched", local.Id, local.Sku, null, null));
                    }
                }
                else
                {
                    results.Add(new SyncProductResult(part.Id, wmsSku, wmsDesc, "matched", local.Id, local.Sku, null, null));
                }
            }
            else
            {
                var brand = DetectBrand(wmsDesc);
                var category = DetectCategory(wmsSku);
                if (req.Mode == "confirm")
                {
                    var created = new Product
                    {
                        Id = Guid.NewGuid().ToString(),
                        Sku = wmsSku,
                        WmsPartNo = wmsSku,
                        Brand = brand,
                        Name = string.IsNullOrEmpty(wmsDesc) ? wmsSku : wmsDesc,
                        Category = category,
                        Uom = part.Uom ?? "EA",
                        PartType = part.PartTypeName,
                        Price = 0,
                        WarrantyMonths = 24,
                        PmIntervalMonths = 3,
                        Active = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };
                    db.Products.Add(created);
                    await db.SaveChangesAsync(ct);
                    results.Add(new SyncProductResult(part.Id, wmsSku, wmsDesc, "created", created.Id, null, brand.ToString(), category));
                }
                else
                {
                    results.Add(new SyncProductResult(part.Id, wmsSku, wmsDesc, "to_create", null, null, brand.ToString(), category));
                }
            }
        }

        var summary = new SyncProductSummary(
            TotalWms: wmsParts.Count,
            Filtered: filtered.Count,
            Matched: results.Count(r => r.Status == "matched"),
            Linked: results.Count(r => r.Status == "linked"),
            ToCreate: results.Count(r => r.Status == "to_create"),
            Created: results.Count(r => r.Status == "created"));
        return new SyncProductsResponse(req.Mode, summary, results);
    }

    public Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct) =>
        WmsSyncLogger.LogAsync(db, "scan_in", "push", req, () => wms.ScanInAsync(req, ct), ct);

    public Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct) =>
        WmsSyncLogger.LogAsync(db, "scan_out", "push", req, () => wms.ScanOutAsync(req, ct), ct);

    public Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct) =>
        WmsSyncLogger.LogAsync(db, "close_order", "push", req, () => wms.CloseOrderAsync(req, ct), ct);

    public Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct) =>
        WmsSyncLogger.LogAsync(db, "inventory_count", "push", req, () => wms.InventoryCountAsync(req, ct), ct);

    private static Brand DetectBrand(string desc)
    {
        var lower = desc.ToLowerInvariant();
        foreach (var (keyword, brand) in BrandMap)
            if (lower.Contains(keyword)) return brand;
        return Brand.MAXNUM;
    }

    private static string DetectCategory(string sku)
    {
        var pfx = string.Empty;
        foreach (var c in sku)
        {
            if (char.IsLetter(c)) pfx += c; else break;
        }
        return CategoryMap.TryGetValue(pfx, out var cat) ? cat : "Other";
    }
}
