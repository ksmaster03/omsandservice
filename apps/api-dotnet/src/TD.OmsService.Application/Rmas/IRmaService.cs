using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Rmas;

public interface IRmaService
{
    Task<PagedResult<RmaListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<RmaDto?> GetAsync(string id, CancellationToken ct);
    Task<RmaDto?> UpdateStageAsync(string id, UpdateRmaStageRequest req, CancellationToken ct);
}
