using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.SalesOrders;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.SalesOrders;

public sealed class SalesOrderService(AppDbContext db) : ISalesOrderService
{
    public async Task<PagedResult<SalesOrderListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.SalesOrders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(so => EF.Functions.ILike(so.SoNo, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(so => so.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(so => new SalesOrderListItem(so.Id, so.SoNo, so.CustomerId, so.Status, so.Total))
            .ToListAsync(ct);
        return new PagedResult<SalesOrderListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<SalesOrderDto?> GetAsync(string id, CancellationToken ct)
    {
        var so = await db.SalesOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return so is null ? null : Map(so);
    }

    public async Task<SalesOrderDto?> UpdateStatusAsync(string id, UpdateSoStatusRequest req, CancellationToken ct)
    {
        var so = await db.SalesOrders.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (so is null) return null;
        so.Status = req.Status;
        so.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(so);
    }

    private static SalesOrderDto Map(SalesOrder so) => new(
        so.Id, so.SoNo, so.CustomerId, so.QuotationId, so.Status, so.Total, so.CreatedAt, so.UpdatedAt);
}
