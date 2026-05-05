using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Renewals;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Renewals;

public sealed class RenewalService(AppDbContext db) : IRenewalService
{
    public async Task<PagedResult<RenewalListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var total = await db.WarrantyRenewals.CountAsync(ct);
        var items = await db.WarrantyRenewals.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(r => new RenewalListItem(r.Id, r.AssetId, r.Status, r.Price, r.NewEndDate))
            .ToListAsync(ct);
        return new PagedResult<RenewalListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<RenewalDto?> GetAsync(string id, CancellationToken ct)
    {
        var r = await db.WarrantyRenewals.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? null : new RenewalDto(r.Id, r.AssetId, r.Status, r.Type, r.Price, r.NewEndDate, r.PaidAt, r.CreatedAt);
    }
}
