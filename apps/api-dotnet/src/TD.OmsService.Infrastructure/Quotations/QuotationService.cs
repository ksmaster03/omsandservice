using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Pdf;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Quotations;

public sealed class QuotationService(AppDbContext db) : IQuotationService
{
    public async Task<PagedResult<QuotationListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Quotations.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(qq => EF.Functions.ILike(qq.QuoteNo, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(qq => qq.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(qq => new QuotationListItem(qq.Id, qq.QuoteNo, qq.CustomerId, qq.Status, qq.Total, qq.ValidUntil))
            .ToListAsync(ct);
        return new PagedResult<QuotationListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<QuotationDto?> GetAsync(string id, CancellationToken ct)
    {
        var q = await db.Quotations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return q is null ? null : Map(q);
    }

    public async Task<QuotationDto?> UpdateStatusAsync(string id, UpdateQuoteStatusRequest req, CancellationToken ct)
    {
        var q = await db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (q is null) return null;
        q.Status = req.Status;
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(q);
    }

    public async Task<QuotePdfInput?> BuildPdfInputAsync(string id, CancellationToken ct)
    {
        var q = await db.Quotations.AsNoTracking()
            .Where(x => x.Id == id)
            .Include(x => x.Customer)
            .Include(x => x.Sales)
            .Include(x => x.QuotationItems).ThenInclude(it => it.Product)
            .FirstOrDefaultAsync(ct);
        if (q is null) return null;

        var subtotal = q.Subtotal;
        var vatRate = subtotal == 0 ? 0m : Math.Round(q.Vat * 100 / subtotal, 0);
        var items = q.QuotationItems
            .Select(it => new QuotePdfLineItem(
                it.Product.Name,
                it.Product.Sku,
                it.Qty,
                it.UnitPrice,
                it.Discount,
                (it.UnitPrice * it.Qty) - it.Discount))
            .ToList();

        return new QuotePdfInput(
            QuoteNo: q.QuoteNo,
            CreatedAt: q.CreatedAt,
            ValidUntil: q.ValidUntil,
            Status: q.Status.ToString(),
            Customer: new QuotePdfCustomer(
                q.Customer.Name, q.Customer.TaxId, q.Customer.Address,
                q.Customer.ContactName, q.Customer.Phone, q.Customer.Email),
            Sales: new QuotePdfSales(q.Sales.Name, q.Sales.Email),
            Items: items,
            Subtotal: q.Subtotal,
            Discount: q.Discount,
            VatRate: vatRate,
            Vat: q.Vat,
            Total: q.Total);
    }

    private static QuotationDto Map(Quotation q) => new(
        q.Id, q.QuoteNo, q.LeadId, q.CustomerId, q.SalesId, q.Status,
        q.Subtotal, q.Discount, q.Vat, q.Total, q.ValidUntil, q.PdfS3key,
        q.CreatedAt, q.UpdatedAt);
}
