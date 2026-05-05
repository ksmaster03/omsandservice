using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.PmSchedules;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.PmSchedules;

public sealed class PmScheduleService(AppDbContext db) : IPmScheduleService
{
    public async Task<PagedResult<PmScheduleListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var total = await db.PmSchedules.CountAsync(ct);
        var items = await db.PmSchedules.AsNoTracking()
            .OrderBy(p => p.ScheduledAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(p => new PmScheduleListItem(p.Id, p.AssetId, p.Status, p.ScheduledAt))
            .ToListAsync(ct);
        return new PagedResult<PmScheduleListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<PmScheduleDto?> GetAsync(string id, CancellationToken ct)
    {
        var p = await db.PmSchedules.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : new PmScheduleDto(p.Id, p.AssetId, p.TechId, p.Status, p.ScheduledAt, p.CompletedAt, p.Note);
    }
}
