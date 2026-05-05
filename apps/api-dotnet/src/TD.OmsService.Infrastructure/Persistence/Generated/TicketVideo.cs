using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class TicketVideo
{
    public string Id { get; set; } = null!;

    public string TicketId { get; set; } = null!;

    public string S3Key { get; set; } = null!;

    public int Size { get; set; }

    public int? Duration { get; set; }

    public virtual ServiceTicket Ticket { get; set; } = null!;
}
