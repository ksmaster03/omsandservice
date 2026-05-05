using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Setting
{
    public string Key { get; set; } = null!;

    public string Value { get; set; } = null!;

    public string? UpdatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }
}
