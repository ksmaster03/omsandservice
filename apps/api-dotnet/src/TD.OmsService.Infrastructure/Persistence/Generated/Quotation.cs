using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Quotation
{
    public string Id { get; set; } = null!;

    public string QuoteNo { get; set; } = null!;

    public string? LeadId { get; set; }

    public string CustomerId { get; set; } = null!;

    public string SalesId { get; set; } = null!;

    public decimal Subtotal { get; set; }

    public decimal Discount { get; set; }

    public decimal Vat { get; set; }

    public decimal Total { get; set; }

    public DateTime ValidUntil { get; set; }

    public string? PdfS3key { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual Lead? Lead { get; set; }

    public virtual ICollection<QuotationItem> QuotationItems { get; set; } = new List<QuotationItem>();

    public virtual User Sales { get; set; } = null!;

    public virtual SalesOrder? SalesOrder { get; set; }
}
