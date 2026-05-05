using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Leads;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Leads;

/// <summary>
/// Phase 3 reference: read-only Lead list/get against the scaffolded entity.
/// The Postgres native enum `stage` is skipped by EF scaffold, so we read it
/// via raw SQL with `stage::text`. Update/Create flows wait until the enum
/// is mapped via NpgsqlDataSourceBuilder.MapEnum&lt;LeadStage&gt;().
/// </summary>
public sealed class LeadService(AppDbContext db) : ILeadService
{
    private sealed record LeadRow(string Id, string CustomerId, string Stage, DateTime CreatedAt, DateTime UpdatedAt);

    public async Task<PagedResult<LeadListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var skip = (q.SafePage - 1) * q.SafePageSize;
        var rows = await db.Database
            .SqlQuery<LeadRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", stage::text AS "Stage",
                       "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "Lead"
                ORDER BY "createdAt" DESC
                LIMIT {q.SafePageSize} OFFSET {skip}
                """)
            .ToListAsync(ct);
        var total = await db.Leads.CountAsync(ct);
        var items = rows.Select(r => new LeadListItem(r.Id, r.CustomerId, r.Stage)).ToList();
        return new PagedResult<LeadListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<LeadDto?> GetAsync(string id, CancellationToken ct)
    {
        var row = await db.Database
            .SqlQuery<LeadRow>($"""
                SELECT id AS "Id", "customerId" AS "CustomerId", stage::text AS "Stage",
                       "createdAt" AS "CreatedAt", "updatedAt" AS "UpdatedAt"
                FROM "Lead" WHERE id = {id} LIMIT 1
                """)
            .FirstOrDefaultAsync(ct);
        return row is null ? null : new LeadDto(row.Id, row.CustomerId, row.Stage, row.CreatedAt, row.UpdatedAt);
    }

    public Task<LeadDto> CreateAsync(CreateLeadRequest req, CancellationToken ct) =>
        throw new NotImplementedException("Phase 3 — pending Npgsql enum mapping for LeadStage.");

    public Task<LeadDto?> UpdateStageAsync(string id, UpdateLeadStageRequest req, CancellationToken ct) =>
        throw new NotImplementedException("Phase 3 — pending Npgsql enum mapping for LeadStage.");
}
