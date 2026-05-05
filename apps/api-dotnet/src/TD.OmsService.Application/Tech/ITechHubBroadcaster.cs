using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Tech;

/// <summary>
/// Real-time fan-out abstraction. The Api project provides the SignalR-backed
/// implementation; Tests substitute a no-op so we don't need a transport.
/// </summary>
public interface ITechHubBroadcaster
{
    Task TicketStageChangedAsync(string ticketId, string customerId, TicketStage stage, CancellationToken ct);
    Task GpsPingAsync(string techId, decimal lat, decimal lng, CancellationToken ct);
}
