using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class InstallChecklist
{
    public string Id { get; set; } = null!;

    public string InstallationId { get; set; } = null!;

    public int Step { get; set; }

    public string Label { get; set; } = null!;

    public bool Checked { get; set; }

    public string? PhotoKey { get; set; }

    public string? Note { get; set; }

    public DateTime? CheckedAt { get; set; }

    public string? CheckedBy { get; set; }
}
