using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.ServiceAgreements;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.ServiceAgreements;

public sealed class ServiceAgreementService(AppDbContext db) : IServiceAgreementService
{
    public async Task<PagedResult<ServiceAgreementListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var total = await db.ServiceAgreements.CountAsync(ct);
        var items = await db.ServiceAgreements.AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(s => new ServiceAgreementListItem(s.Id, s.CustomerId, s.Status, s.EndDate))
            .ToListAsync(ct);
        return new PagedResult<ServiceAgreementListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<ServiceAgreementDto?> GetAsync(string id, CancellationToken ct)
    {
        var s = await db.ServiceAgreements.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? null : new ServiceAgreementDto(s.Id, s.CustomerId, s.Status, s.StartDate, s.EndDate);
    }
}
