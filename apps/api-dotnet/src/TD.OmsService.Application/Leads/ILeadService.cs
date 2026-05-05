using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Leads;

public interface ILeadService
{
    Task<PagedResult<LeadListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<LeadDto?> GetAsync(string id, CancellationToken ct);
    Task<LeadDto> CreateAsync(CreateLeadRequest req, CancellationToken ct);
    Task<LeadDto?> UpdateStageAsync(string id, UpdateLeadStageRequest req, CancellationToken ct);
}
