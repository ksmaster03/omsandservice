using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Quotations;

public sealed class QuotationService(AppDbContext db) : IQuotationService
{
    private sealed record QuotationRow(string Id, string CustomerId, string Status, decimal Total, DateTime ValidUntil, DateTime CreatedAt, DateTime UpdatedAt);

    public async Task<PagedResult<QuotationListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var skip = (q.SafePage - 1) * q.SafePageSize;
        var rows = await db.Database
            .SqlQuery<QuotationRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", status::text AS "Status",
                       total AS "Total", "validUntil" AS "ValidUntil",
                       "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "Quotation"
                ORDER BY "createdAt" DESC
                LIMIT {q.SafePageSize} OFFSET {skip}
                """)
            .ToListAsync(ct);
        var total = await db.Quotations.CountAsync(ct);
        var items = rows.Select(r => new QuotationListItem(r.Id, r.CustomerId, r.Status, r.Total, r.ValidUntil)).ToList();
        return new PagedResult<QuotationListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<QuotationDto?> GetAsync(string id, CancellationToken ct)
    {
        var row = await db.Database
            .SqlQuery<QuotationRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", status::text AS "Status",
                       total AS "Total", "validUntil" AS "ValidUntil",
                       "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "Quotation" WHERE id = {id} LIMIT 1
                """)
            .FirstOrDefaultAsync(ct);
        return row is null ? null : new QuotationDto(row.Id, row.CustomerId, row.Status, row.Total, row.ValidUntil, row.CreatedAt, row.UpdatedAt);
    }
}
