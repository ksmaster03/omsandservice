using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Quotations;

public interface IQuotationService
{
    Task<PagedResult<QuotationListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<QuotationDto?> GetAsync(string id, CancellationToken ct);
}
