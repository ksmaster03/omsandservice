using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Lead
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string OwnerId { get; set; } = null!;

    public decimal Value { get; set; }

    public DateTime? ExpectedClose { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<Demo> Demos { get; set; } = new List<Demo>();

    public virtual User Owner { get; set; } = null!;

    public virtual ICollection<Quotation> Quotations { get; set; } = new List<Quotation>();
}
