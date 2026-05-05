using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class PmSchedule
{
    public string Id { get; set; } = null!;

    public string AssetId { get; set; } = null!;

    public DateTime ScheduledAt { get; set; }

    public string? TechId { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? Note { get; set; }

    public virtual Asset Asset { get; set; } = null!;

    public virtual User? Tech { get; set; }
}
