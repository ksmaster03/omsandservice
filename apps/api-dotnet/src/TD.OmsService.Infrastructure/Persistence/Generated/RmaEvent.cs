using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class RmaEvent
{
    public string Id { get; set; } = null!;

    public string RmaId { get; set; } = null!;

    public string? Note { get; set; }

    public string? ActorId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Rma Rma { get; set; } = null!;
}
