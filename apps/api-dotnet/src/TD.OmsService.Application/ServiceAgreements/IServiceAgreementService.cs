using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.ServiceAgreements;

public interface IServiceAgreementService
{
    Task<PagedResult<ServiceAgreementListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<ServiceAgreementDto?> GetAsync(string id, CancellationToken ct);
}
