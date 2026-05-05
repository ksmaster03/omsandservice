using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Rma
{
    public string Id { get; set; } = null!;

    public string RmaNo { get; set; } = null!;

    public string? BusinessKey { get; set; }

    public string CustomerId { get; set; } = null!;

    public string AssetId { get; set; } = null!;

    public string? SoId { get; set; }

    public string Description { get; set; } = null!;

    public DateTime? PickupAt { get; set; }

    public DateTime? PickedUpAt { get; set; }

    public DateTime? InspectedAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public decimal? RefundAmount { get; set; }

    public string? ReplacementAssetId { get; set; }

    public string? TechId { get; set; }

    public string? Note { get; set; }

    public string? CreatedById { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Asset Asset { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<RmaEvent> RmaEvents { get; set; } = new List<RmaEvent>();

    public virtual User? Tech { get; set; }
}
