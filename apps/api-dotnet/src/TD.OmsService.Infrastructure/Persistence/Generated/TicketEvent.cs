using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class TicketEvent
{
    public string Id { get; set; } = null!;

    public string TicketId { get; set; } = null!;

    public string? Note { get; set; }

    public string? ActorId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? Actor { get; set; }

    public virtual ServiceTicket Ticket { get; set; } = null!;
}
