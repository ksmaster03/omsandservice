using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.SalesOrders;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.SalesOrders;

public sealed class SalesOrderService(AppDbContext db) : ISalesOrderService
{
    private sealed record SoRow(string Id, string CustomerId, string Status, decimal Total, DateTime CreatedAt, DateTime UpdatedAt);

    public async Task<PagedResult<SalesOrderListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var skip = (q.SafePage - 1) * q.SafePageSize;
        var rows = await db.Database
            .SqlQuery<SoRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", status::text AS "Status",
                       total AS "Total", "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "SalesOrder"
                ORDER BY "createdAt" DESC
                LIMIT {q.SafePageSize} OFFSET {skip}
                """)
            .ToListAsync(ct);
        var total = await db.SalesOrders.CountAsync(ct);
        var items = rows.Select(r => new SalesOrderListItem(r.Id, r.CustomerId, r.Status, r.Total)).ToList();
        return new PagedResult<SalesOrderListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<SalesOrderDto?> GetAsync(string id, CancellationToken ct)
    {
        var row = await db.Database
            .SqlQuery<SoRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", status::text AS "Status",
                       total AS "Total", "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "SalesOrder" WHERE id = {id} LIMIT 1
                """)
            .FirstOrDefaultAsync(ct);
        return row is null ? null : new SalesOrderDto(row.Id, row.CustomerId, row.Status, row.Total, row.CreatedAt, row.UpdatedAt);
    }
}
