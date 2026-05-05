using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class WmsStockCache
{
    public string Sku { get; set; } = null!;

    public string Warehouse { get; set; } = null!;

    public int Qty { get; set; }

    public DateTime UpdatedAt { get; set; }
}
