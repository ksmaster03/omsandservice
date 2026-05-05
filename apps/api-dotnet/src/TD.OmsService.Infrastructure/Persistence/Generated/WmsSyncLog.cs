using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class WmsSyncLog
{
    public string Id { get; set; } = null!;

    public string Entity { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string RequestJson { get; set; } = null!;

    public string? ResponseJson { get; set; }

    public string? ErrorMsg { get; set; }

    public DateTime CreatedAt { get; set; }
}
