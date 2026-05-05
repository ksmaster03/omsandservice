using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Rmas;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Rmas;

public sealed class RmaService(AppDbContext db) : IRmaService
{
    public async Task<PagedResult<RmaListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Rmas.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(r => EF.Functions.ILike(r.RmaNo, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(r => new RmaListItem(r.Id, r.RmaNo, r.CustomerId, r.Reason, r.Stage))
            .ToListAsync(ct);
        return new PagedResult<RmaListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<RmaDto?> GetAsync(string id, CancellationToken ct)
    {
        var r = await db.Rmas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? null : new RmaDto(r.Id, r.RmaNo, r.CustomerId, r.AssetId,
            r.Reason, r.Stage, r.Resolution, r.CreatedAt, r.UpdatedAt);
    }

    public async Task<RmaDto?> UpdateStageAsync(string id, UpdateRmaStageRequest req, CancellationToken ct)
    {
        var r = await db.Rmas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return null;
        r.Stage = req.Stage;
        if (req.Resolution.HasValue) r.Resolution = req.Resolution;
        r.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new RmaDto(r.Id, r.RmaNo, r.CustomerId, r.AssetId,
            r.Reason, r.Stage, r.Resolution, r.CreatedAt, r.UpdatedAt);
    }
}
