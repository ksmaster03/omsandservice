using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class FeedbackReply
{
    public string Id { get; set; } = null!;

    public string FeedbackId { get; set; } = null!;

    public string Message { get; set; } = null!;

    public string AuthorName { get; set; } = null!;

    public string? AuthorRole { get; set; }

    public bool IsInternal { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Feedback Feedback { get; set; } = null!;
}
