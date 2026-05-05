using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Soitem
{
    public string Id { get; set; } = null!;

    public string SoId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public int Qty { get; set; }

    public decimal UnitPrice { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual SalesOrder So { get; set; } = null!;
}
