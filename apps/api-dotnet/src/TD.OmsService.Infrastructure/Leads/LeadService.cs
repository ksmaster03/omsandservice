using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Leads;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Leads;

public sealed class LeadService(AppDbContext db) : ILeadService
{
    public async Task<PagedResult<LeadListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Leads.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(l => EF.Functions.ILike(l.Customer.Name, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(l => new LeadListItem(l.Id, l.CustomerId, l.Stage, l.Value))
            .ToListAsync(ct);
        return new PagedResult<LeadListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<LeadDto?> GetAsync(string id, CancellationToken ct)
    {
        var l = await db.Leads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return l is null ? null : Map(l);
    }

    public async Task<LeadDto> CreateAsync(CreateLeadRequest req, CancellationToken ct)
    {
        var entity = new Lead
        {
            Id = Guid.NewGuid().ToString(),
            CustomerId = req.CustomerId,
            OwnerId = req.OwnerId,
            Value = req.Value,
            ExpectedClose = req.ExpectedClose,
            Note = req.Note,
            Stage = LeadStage.LEAD,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Leads.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<LeadDto?> UpdateStageAsync(string id, UpdateLeadStageRequest req, CancellationToken ct)
    {
        var entity = await db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (entity is null) return null;
        if (!IsValidTransition(entity.Stage, req.Stage))
        {
            throw new InvalidOperationException($"Invalid stage transition: {entity.Stage} → {req.Stage}");
        }
        entity.Stage = req.Stage;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    /// <summary>
    /// Mirrors the state machine in apps/api: Leads can advance forward through
    /// the pipeline or jump to LOST from any non-terminal stage.
    /// </summary>
    private static bool IsValidTransition(LeadStage from, LeadStage to)
    {
        if (from == to) return true;
        if (to == LeadStage.LOST && from != LeadStage.WON) return true;
        return (from, to) switch
        {
            (LeadStage.LEAD, LeadStage.QUALIFIED) => true,
            (LeadStage.QUALIFIED, LeadStage.DEMO) => true,
            (LeadStage.DEMO, LeadStage.QUOTE) => true,
            (LeadStage.QUOTE, LeadStage.NEGOTIATION) => true,
            (LeadStage.NEGOTIATION, LeadStage.WON) => true,
            _ => false,
        };
    }

    private static LeadDto Map(Lead l) => new(
        l.Id, l.CustomerId, l.OwnerId, l.Stage, l.Value, l.ExpectedClose, l.Note, l.CreatedAt, l.UpdatedAt);
}
