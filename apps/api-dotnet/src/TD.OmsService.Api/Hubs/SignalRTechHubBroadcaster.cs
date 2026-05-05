using Microsoft.AspNetCore.SignalR;
using TD.OmsService.Application.Tech;
using TD.OmsService.Domain.Common;

namespace TD.OmsService.Api.Hubs;

/// <summary>SignalR-backed implementation of ITechHubBroadcaster.</summary>
public sealed class SignalRTechHubBroadcaster(IHubContext<TechHub> hub) : ITechHubBroadcaster
{
    public Task TicketStageChangedAsync(string ticketId, string customerId, TicketStage stage, CancellationToken ct) =>
        hub.Clients.All.SendAsync("ticketStageChanged", new { ticketId, customerId, stage = stage.ToString() }, ct);

    public Task GpsPingAsync(string techId, decimal lat, decimal lng, CancellationToken ct) =>
        hub.Clients.Group($"tech:{techId}").SendAsync("gpsPing", new { techId, lat, lng, ts = DateTimeOffset.UtcNow }, ct);
}
