namespace TD.OmsService.Application.Pdf;

public sealed record QuotePdfLineItem(string Name, string Sku, int Qty, decimal UnitPrice, decimal Discount, decimal LineTotal);

public sealed record QuotePdfCustomer(string Name, string? TaxId, string? Address, string? ContactName, string? Phone, string? Email);

public sealed record QuotePdfSales(string Name, string Email);

public sealed record QuotePdfInput(
    string QuoteNo,
    DateTime CreatedAt,
    DateTime ValidUntil,
    string Status,
    QuotePdfCustomer Customer,
    QuotePdfSales Sales,
    IReadOnlyList<QuotePdfLineItem> Items,
    decimal Subtotal,
    decimal Discount,
    decimal VatRate,
    decimal Vat,
    decimal Total);

public interface IQuotePdfGenerator
{
    /// <summary>Render a quotation PDF as a byte array. The Node implementation uses Puppeteer + HTML; this port uses QuestPDF for a smaller deploy footprint.</summary>
    byte[] Render(QuotePdfInput input);
}
