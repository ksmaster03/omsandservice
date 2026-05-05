using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class PaymentMilestone
{
    public string Id { get; set; } = null!;

    public string SoId { get; set; } = null!;

    public int Seq { get; set; }

    public string Label { get; set; } = null!;

    public decimal Amount { get; set; }

    public DateTime DueDate { get; set; }

    public DateTime? PaidAt { get; set; }

    public virtual SalesOrder So { get; set; } = null!;
}
