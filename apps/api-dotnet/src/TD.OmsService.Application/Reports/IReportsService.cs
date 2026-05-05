namespace TD.OmsService.Application.Reports;

public interface IReportsService
{
    Task<DashboardSummaryDto> DashboardAsync(CancellationToken ct);
    Task<IReadOnlyList<SalesPipelineCountDto>> SalesPipelineAsync(CancellationToken ct);
    Task<IReadOnlyList<ProductTopSellerDto>> TopSellersAsync(int limit, CancellationToken ct);
    Task<IReadOnlyList<TicketsByStageDto>> TicketsByStageAsync(CancellationToken ct);
}
