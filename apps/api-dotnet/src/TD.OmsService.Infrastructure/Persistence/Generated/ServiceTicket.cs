using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class ServiceTicket
{
    public string Id { get; set; } = null!;

    public string TicketNo { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string AssetId { get; set; } = null!;

    public string Description { get; set; } = null!;

    public decimal? LocationLat { get; set; }

    public decimal? LocationLng { get; set; }

    public string? LocationAddress { get; set; }

    public string? LocationDetail { get; set; }

    public string? AssignedTechId { get; set; }

    public DateTime? SlaDueAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public int? CustomerRating { get; set; }

    public string? CustomerReview { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? BusinessKey { get; set; }

    public virtual Asset Asset { get; set; } = null!;

    public virtual User? AssignedTech { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<TicketEvent> TicketEvents { get; set; } = new List<TicketEvent>();

    public virtual ICollection<TicketPhoto> TicketPhotos { get; set; } = new List<TicketPhoto>();

    public virtual TicketVideo? TicketVideo { get; set; }
}
