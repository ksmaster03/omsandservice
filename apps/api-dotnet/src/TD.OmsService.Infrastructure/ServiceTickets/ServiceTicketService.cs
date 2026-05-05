using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.ServiceTickets;

public sealed class ServiceTicketService(AppDbContext db) : IServiceTicketService
{
    public async Task<PagedResult<ServiceTicketListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.ServiceTickets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(t => EF.Functions.ILike(t.TicketNo, $"%{s}%") || EF.Functions.ILike(t.Description, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(t => new ServiceTicketListItem(t.Id, t.TicketNo, t.CustomerId, t.ProblemType, t.Priority, t.Stage))
            .ToListAsync(ct);
        return new PagedResult<ServiceTicketListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<ServiceTicketDto?> GetAsync(string id, CancellationToken ct)
    {
        var t = await db.ServiceTickets.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return t is null ? null : Map(t);
    }

    public async Task<ServiceTicketDto?> UpdateStageAsync(string id, UpdateTicketStageRequest req, CancellationToken ct)
    {
        var t = await db.ServiceTickets.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return null;
        if (!IsValidTransition(t.Stage, req.Stage))
        {
            throw new InvalidOperationException($"Invalid ticket stage transition: {t.Stage} → {req.Stage}");
        }
        t.Stage = req.Stage;
        if (req.Stage == TicketStage.CLOSED) t.ClosedAt = DateTime.UtcNow;
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(t);
    }

    public async Task<ServiceTicketDto?> AssignTechAsync(string id, AssignTechRequest req, CancellationToken ct)
    {
        var t = await db.ServiceTickets.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return null;
        t.AssignedTechId = req.TechId;
        if (t.Stage == TicketStage.RECEIVED) t.Stage = TicketStage.ASSIGNED;
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(t);
    }

    private static bool IsValidTransition(TicketStage from, TicketStage to)
    {
        if (from == to) return true;
        if (to == TicketStage.CANCELLED && from != TicketStage.CLOSED) return true;
        return (from, to) switch
        {
            (TicketStage.RECEIVED, TicketStage.ASSIGNED) => true,
            (TicketStage.ASSIGNED, TicketStage.EN_ROUTE) => true,
            (TicketStage.EN_ROUTE, TicketStage.ARRIVED) => true,
            (TicketStage.ARRIVED, TicketStage.REPAIRING) => true,
            (TicketStage.REPAIRING, TicketStage.CLOSED) => true,
            _ => false,
        };
    }

    private static ServiceTicketDto Map(ServiceTicket t) => new(
        t.Id, t.TicketNo, t.CustomerId, t.AssetId, t.Description,
        t.ProblemType, t.Priority, t.Stage, t.AssignedTechId,
        t.SlaDueAt, t.ClosedAt, t.CustomerRating, t.CreatedAt, t.UpdatedAt);
}
