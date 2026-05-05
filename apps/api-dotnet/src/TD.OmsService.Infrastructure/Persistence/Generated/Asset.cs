using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Asset
{
    public string Id { get; set; } = null!;

    public string SerialNo { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string SoId { get; set; } = null!;

    public DateTime InstalledAt { get; set; }

    public DateTime WarrantyEnd { get; set; }

    public DateTime? NextPmDate { get; set; }

    public string? LocationDetail { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<PmSchedule> PmSchedules { get; set; } = new List<PmSchedule>();

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<Rma> Rmas { get; set; } = new List<Rma>();

    public virtual ICollection<ServiceTicket> ServiceTickets { get; set; } = new List<ServiceTicket>();

    public virtual SalesOrder So { get; set; } = null!;

    public virtual ICollection<WarrantyRenewal> WarrantyRenewals { get; set; } = new List<WarrantyRenewal>();
}
