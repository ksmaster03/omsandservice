using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class QuotationItem
{
    public string Id { get; set; } = null!;

    public string QuotationId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public int Qty { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal Discount { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Quotation Quotation { get; set; } = null!;
}
