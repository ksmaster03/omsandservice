using TD.OmsService.Domain.Common;

namespace TD.OmsService.Domain.Entities;

public class Product : Entity
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Brand { get; set; }
    public string? Unit { get; set; }
    public decimal? StandardPrice { get; set; }
    public bool Active { get; set; } = true;
    public string? CustomDataJson { get; set; }
}
