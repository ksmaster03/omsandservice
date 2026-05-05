using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class AuditLog
{
    public string Id { get; set; } = null!;

    public string? UserId { get; set; }

    public string Entity { get; set; } = null!;

    public string EntityId { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string? Diff { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
