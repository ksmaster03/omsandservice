using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TD.OmsService.Api.Hubs;

/// <summary>
/// SignalR replacement for socket.io used by Tech PWA (apps/tech/useTechSocket).
/// Phase 4 will add ticket assignment broadcasts and GPS pings; this stub
/// establishes the connection contract so frontend client can be migrated to
/// @microsoft/signalr in parallel with backend work.
/// </summary>
[Authorize(Policy = "Staff")]
public sealed class TechHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var techId = Context.User?.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(techId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tech:{techId}");
        }
        await base.OnConnectedAsync();
    }

    public Task Ping() => Clients.Caller.SendAsync("pong", DateTimeOffset.UtcNow);
}
