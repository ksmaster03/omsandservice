using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class TechLocation
{
    public string TechId { get; set; } = null!;

    public decimal Lat { get; set; }

    public decimal Lng { get; set; }

    public double? Accuracy { get; set; }

    public string? ActiveTicketId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User Tech { get; set; } = null!;
}
