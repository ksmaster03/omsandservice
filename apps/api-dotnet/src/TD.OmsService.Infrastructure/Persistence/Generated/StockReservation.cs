using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class StockReservation
{
    public string Id { get; set; } = null!;

    public string StockItemId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string SoId { get; set; } = null!;

    public string SoItemId { get; set; } = null!;

    public int Qty { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReleasedAt { get; set; }

    public DateTime? ConsumedAt { get; set; }

    public string? Note { get; set; }

    public virtual StockItem StockItem { get; set; } = null!;
}
