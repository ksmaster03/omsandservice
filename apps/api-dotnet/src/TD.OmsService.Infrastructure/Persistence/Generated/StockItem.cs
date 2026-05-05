using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class StockItem
{
    public string Id { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public int OnHand { get; set; }

    public int Reserved { get; set; }

    public int ReorderAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<StockReservation> StockReservations { get; set; } = new List<StockReservation>();
}
