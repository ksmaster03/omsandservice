using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Quotations;

public sealed record QuotationDto(
    string Id,
    string QuoteNo,
    string? LeadId,
    string CustomerId,
    string SalesId,
    QuoteStatus Status,
    decimal Subtotal,
    decimal Discount,
    decimal Vat,
    decimal Total,
    DateTime ValidUntil,
    string? PdfS3key,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record QuotationListItem(string Id, string QuoteNo, string CustomerId, QuoteStatus Status, decimal Total, DateTime ValidUntil);

public sealed record UpdateQuoteStatusRequest(QuoteStatus Status);
