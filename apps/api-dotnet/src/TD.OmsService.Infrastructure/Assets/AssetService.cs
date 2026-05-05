using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Assets;
using TD.OmsService.Application.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Assets;

public sealed class AssetService(AppDbContext db) : IAssetService
{
    public async Task<PagedResult<AssetListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Assets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(a => EF.Functions.ILike(a.SerialNo, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.InstalledAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(a => new AssetListItem(a.Id, a.SerialNo, a.CustomerId, a.WarrantyEnd, a.NextPmDate))
            .ToListAsync(ct);
        return new PagedResult<AssetListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<AssetDto?> GetAsync(string id, CancellationToken ct)
    {
        var a = await db.Assets.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return a is null ? null : new AssetDto(a.Id, a.SerialNo, a.ProductId, a.CustomerId, a.SoId,
            a.InstalledAt, a.WarrantyEnd, a.NextPmDate, a.LocationDetail);
    }

    public async Task<IReadOnlyList<AssetListItem>> ListByCustomerAsync(string customerId, CancellationToken ct)
    {
        return await db.Assets.AsNoTracking()
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.InstalledAt)
            .Select(a => new AssetListItem(a.Id, a.SerialNo, a.CustomerId, a.WarrantyEnd, a.NextPmDate))
            .ToListAsync(ct);
    }
}
