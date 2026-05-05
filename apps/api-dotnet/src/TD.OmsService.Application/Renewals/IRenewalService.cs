using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Renewals;

public interface IRenewalService
{
    Task<PagedResult<RenewalListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<RenewalDto?> GetAsync(string id, CancellationToken ct);
}
