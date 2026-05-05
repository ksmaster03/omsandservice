using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class SparePartUsage
{
    public string Id { get; set; } = null!;

    public string SparePartId { get; set; } = null!;

    public string? TicketId { get; set; }

    public string? RmaId { get; set; }

    public string? PmId { get; set; }

    public int Qty { get; set; }

    public string? TechId { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SparePart SparePart { get; set; } = null!;
}
