using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class LineMessage
{
    public string Id { get; set; } = null!;

    public string? CustomerUserId { get; set; }

    public string? TicketId { get; set; }

    public string? Text { get; set; }

    public string? ImageS3key { get; set; }

    public string? LineMessageId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual CustomerUser? CustomerUser { get; set; }
}
