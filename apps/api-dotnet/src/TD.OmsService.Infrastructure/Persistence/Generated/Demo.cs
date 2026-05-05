using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Demo
{
    public string Id { get; set; } = null!;

    public string LeadId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public DateTime ScheduledAt { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? Location { get; set; }

    public string? Address { get; set; }

    public string? ContactName { get; set; }

    public string? ContactPhone { get; set; }

    public virtual Lead Lead { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
