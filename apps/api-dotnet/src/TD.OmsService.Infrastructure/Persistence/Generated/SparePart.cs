using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class SparePart
{
    public string Id { get; set; } = null!;

    public string PartNo { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Category { get; set; }

    public string Unit { get; set; } = null!;

    public decimal? CostPrice { get; set; }

    public decimal? SellPrice { get; set; }

    public int OnHand { get; set; }

    public int ReorderAt { get; set; }

    public bool Active { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<SparePartUsage> SparePartUsages { get; set; } = new List<SparePartUsage>();
}
