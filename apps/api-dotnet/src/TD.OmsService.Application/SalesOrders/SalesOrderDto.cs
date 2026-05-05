using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.SalesOrders;

public sealed record SalesOrderDto(
    string Id,
    string SoNo,
    string CustomerId,
    string? QuotationId,
    SOStatus Status,
    decimal Total,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record SalesOrderListItem(string Id, string SoNo, string CustomerId, SOStatus Status, decimal Total);

public sealed record UpdateSoStatusRequest(SOStatus Status);
