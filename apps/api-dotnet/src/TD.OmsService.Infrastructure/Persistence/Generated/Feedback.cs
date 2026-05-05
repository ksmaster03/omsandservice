using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Feedback
{
    public string Id { get; set; } = null!;

    public string Subject { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string? Screenshot { get; set; }

    public string Source { get; set; } = null!;

    public string? SubmittedBy { get; set; }

    public string? SubmitterName { get; set; }

    public string? SubmitterEmail { get; set; }

    public string? AssignedTo { get; set; }

    public string? Resolution { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? Attachments { get; set; }

    public virtual ICollection<FeedbackReply> FeedbackReplies { get; set; } = new List<FeedbackReply>();
}
