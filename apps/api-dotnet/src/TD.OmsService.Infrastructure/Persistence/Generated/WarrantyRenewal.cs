using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class WarrantyRenewal
{
    public string Id { get; set; } = null!;

    public string AssetId { get; set; } = null!;

    public string Type { get; set; } = null!;

    public decimal Price { get; set; }

    public DateTime? NewEndDate { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Asset Asset { get; set; } = null!;
}
