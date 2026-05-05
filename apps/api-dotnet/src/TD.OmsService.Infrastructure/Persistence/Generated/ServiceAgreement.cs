using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class ServiceAgreement
{
    public string Id { get; set; } = null!;

    public string AgreementNo { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string? Coverage { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public decimal Price { get; set; }

    public bool AutoRenew { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;
}
