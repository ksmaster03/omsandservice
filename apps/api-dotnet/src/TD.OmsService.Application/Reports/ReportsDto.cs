namespace TD.OmsService.Application.Reports;

public sealed record DashboardSummaryDto(
    int CustomerCount,
    int ActiveAssetCount,
    int OpenTicketCount,
    int OverduePmCount,
    int PendingRmaCount,
    decimal LastMonthRevenue);

public sealed record SalesPipelineCountDto(string Stage, int Count);

public sealed record ProductTopSellerDto(string ProductId, string ProductName, int UnitsSold, decimal Revenue);

public sealed record TicketsByStageDto(string Stage, int Count);
