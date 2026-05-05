namespace TD.OmsService.Application.Quotations;

public sealed record QuotationDto(
    string Id,
    string CustomerId,
    string Status,
    decimal Total,
    DateTime ValidUntil,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record QuotationListItem(string Id, string CustomerId, string Status, decimal Total, DateTime ValidUntil);
