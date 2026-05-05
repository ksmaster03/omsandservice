using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class SalesOrder
{
    public string Id { get; set; } = null!;

    public string SoNo { get; set; } = null!;

    public string? QuotationId { get; set; }

    public string CustomerId { get; set; } = null!;

    public decimal Total { get; set; }

    public string? WmsOrderId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? BusinessKey { get; set; }

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual Customer Customer { get; set; } = null!;

    public virtual Installation? Installation { get; set; }

    public virtual ICollection<PaymentMilestone> PaymentMilestones { get; set; } = new List<PaymentMilestone>();

    public virtual Quotation? Quotation { get; set; }

    public virtual ICollection<Soitem> Soitems { get; set; } = new List<Soitem>();
}
