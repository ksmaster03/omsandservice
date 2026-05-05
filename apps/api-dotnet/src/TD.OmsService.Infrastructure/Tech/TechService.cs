using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Application.Tech;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Tech;

/// <summary>
/// Tech-side workflows for the field PWA. Real-time fan-out goes through the
/// abstract ITechHubBroadcaster — kept abstract so the Tests project can swap
/// in a no-op (we don't want SignalR transport requirements in unit tests).
/// The Api project provides the SignalR-backed implementation; Infrastructure
/// stays clean of ASP.NET Core hosting concerns.
/// </summary>
public sealed class TechService(AppDbContext db, ITechHubBroadcaster broadcaster) : ITechService
{
    public async Task<IReadOnlyList<TechTicketItem>> MyTicketsAsync(string techId, CancellationToken ct)
    {
        return await db.ServiceTickets
            .AsNoTracking()
            .Where(t => t.AssignedTechId == techId && t.Stage != TicketStage.CLOSED && t.Stage != TicketStage.CANCELLED)
            .Include(t => t.Customer)
            .Include(t => t.Asset).ThenInclude(a => a.Product)
            .OrderBy(t => t.Priority).ThenBy(t => t.SlaDueAt ?? DateTime.MaxValue)
            .Select(t => new TechTicketItem(
                t.Id, t.TicketNo, t.Customer.Name, t.Customer.Phone ?? string.Empty,
                t.Asset.Product.Name, t.Asset.SerialNo, t.Description,
                t.Priority, t.ProblemType, t.Stage,
                t.LocationLat, t.LocationLng, t.LocationAddress, t.SlaDueAt))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TechPmItem>> MyPmJobsAsync(string techId, CancellationToken ct)
    {
        return await db.PmSchedules
            .AsNoTracking()
            .Where(p => p.TechId == techId && p.Status != PmStatus.COMPLETED && p.Status != PmStatus.SKIPPED)
            .Include(p => p.Asset).ThenInclude(a => a.Customer)
            .OrderBy(p => p.ScheduledAt)
            .Select(p => new TechPmItem(p.Id, p.Asset.SerialNo, p.Asset.Customer.Name, p.Status, p.ScheduledAt))
            .ToListAsync(ct);
    }

    public async Task<ServiceTicketDto?> UpdateTicketStageAsync(string techId, string ticketId, TicketStage newStage, CancellationToken ct)
    {
        var ticket = await db.ServiceTickets.FirstOrDefaultAsync(t => t.Id == ticketId && t.AssignedTechId == techId, ct);
        if (ticket is null) return null;

        var oldStage = ticket.Stage;
        ticket.Stage = newStage;
        if (newStage == TicketStage.CLOSED) ticket.ClosedAt = DateTime.UtcNow;
        ticket.UpdatedAt = DateTime.UtcNow;

        db.TicketEvents.Add(new TicketEvent
        {
            Id = Guid.NewGuid().ToString(),
            TicketId = ticketId,
            ActorId = techId,
            Stage = newStage,
            Note = $"stage {oldStage} → {newStage}",
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        await broadcaster.TicketStageChangedAsync(ticketId, ticket.CustomerId, newStage, ct);
        return new ServiceTicketDto(
            ticket.Id, ticket.TicketNo, ticket.CustomerId, ticket.AssetId, ticket.Description,
            ticket.ProblemType, ticket.Priority, ticket.Stage, ticket.AssignedTechId,
            ticket.SlaDueAt, ticket.ClosedAt, ticket.CustomerRating, ticket.CreatedAt, ticket.UpdatedAt);
    }

    public async Task RecordLocationAsync(string techId, GpsLocationReport report, CancellationToken ct)
    {
        var loc = await db.TechLocations.FirstOrDefaultAsync(l => l.TechId == techId, ct);
        if (loc is null)
        {
            db.TechLocations.Add(new TechLocation
            {
                TechId = techId,
                Lat = report.Lat,
                Lng = report.Lng,
                Accuracy = report.AccuracyMeters.HasValue ? (double?)report.AccuracyMeters.Value : null,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            loc.Lat = report.Lat;
            loc.Lng = report.Lng;
            loc.Accuracy = report.AccuracyMeters.HasValue ? (double?)report.AccuracyMeters.Value : loc.Accuracy;
            loc.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        await broadcaster.GpsPingAsync(techId, report.Lat, report.Lng, ct);
    }
}

/// <summary>No-op broadcaster used in tests when no transport is available.</summary>
public sealed class NoopTechHubBroadcaster : ITechHubBroadcaster
{
    public Task TicketStageChangedAsync(string ticketId, string customerId, TicketStage stage, CancellationToken ct) => Task.CompletedTask;
    public Task GpsPingAsync(string techId, decimal lat, decimal lng, CancellationToken ct) => Task.CompletedTask;
}
