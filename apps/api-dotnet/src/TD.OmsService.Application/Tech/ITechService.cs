using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Tech;

public interface ITechService
{
    Task<IReadOnlyList<TechTicketItem>> MyTicketsAsync(string techId, CancellationToken ct);
    Task<IReadOnlyList<TechPmItem>> MyPmJobsAsync(string techId, CancellationToken ct);
    Task<ServiceTicketDto?> UpdateTicketStageAsync(string techId, string ticketId, TicketStage newStage, CancellationToken ct);
    Task RecordLocationAsync(string techId, GpsLocationReport report, CancellationToken ct);
}
