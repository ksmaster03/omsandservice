using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class Product
{
    public string Id { get; set; } = null!;

    public string Sku { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Category { get; set; } = null!;

    public decimal Price { get; set; }

    public int WarrantyMonths { get; set; }

    public int PmIntervalMonths { get; set; }

    public bool Active { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? WmsPartNo { get; set; }

    public string? PartType { get; set; }

    public string Uom { get; set; } = null!;

    public int? StandardPack { get; set; }

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual ICollection<Demo> Demos { get; set; } = new List<Demo>();

    public virtual ICollection<QuotationItem> QuotationItems { get; set; } = new List<QuotationItem>();

    public virtual ICollection<Soitem> Soitems { get; set; } = new List<Soitem>();

    public virtual StockItem? StockItem { get; set; }
}
