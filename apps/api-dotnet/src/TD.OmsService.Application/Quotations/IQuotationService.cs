using TD.OmsService.Application.Common;
using TD.OmsService.Application.Pdf;

namespace TD.OmsService.Application.Quotations;

public interface IQuotationService
{
    Task<PagedResult<QuotationListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<QuotationDto?> GetAsync(string id, CancellationToken ct);
    Task<QuotationDto?> UpdateStatusAsync(string id, UpdateQuoteStatusRequest req, CancellationToken ct);
    Task<QuotePdfInput?> BuildPdfInputAsync(string id, CancellationToken ct);
}
