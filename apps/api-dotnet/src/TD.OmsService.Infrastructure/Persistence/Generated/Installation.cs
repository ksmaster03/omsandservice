using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Installation
{
    public string Id { get; set; } = null!;

    public string SoId { get; set; } = null!;

    public DateTime ScheduledAt { get; set; }

    public string? TechId { get; set; }

    public DateTime? CompletedAt { get; set; }

    public List<string>? Photos { get; set; }

    public string? Note { get; set; }

    public string? BusinessKey { get; set; }

    public virtual SalesOrder So { get; set; } = null!;

    public virtual User? Tech { get; set; }
}
