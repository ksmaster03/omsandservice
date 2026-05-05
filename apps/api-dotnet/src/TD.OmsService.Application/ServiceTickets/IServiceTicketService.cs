using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.ServiceTickets;

public interface IServiceTicketService
{
    Task<PagedResult<ServiceTicketListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<ServiceTicketDto?> GetAsync(string id, CancellationToken ct);
    Task<ServiceTicketDto?> UpdateStageAsync(string id, UpdateTicketStageRequest req, CancellationToken ct);
    Task<ServiceTicketDto?> AssignTechAsync(string id, AssignTechRequest req, CancellationToken ct);
}
