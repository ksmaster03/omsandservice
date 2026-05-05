namespace TD.OmsService.Application.SalesOrders;

public sealed record SalesOrderDto(
    string Id,
    string CustomerId,
    string Status,
    decimal Total,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record SalesOrderListItem(string Id, string CustomerId, string Status, decimal Total);
