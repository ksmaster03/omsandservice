using TD.OmsService.Domain.Common;

namespace TD.OmsService.Domain.Entities;

public class Customer : Entity
{
    public string? WmsCode { get; set; }
    public string Name { get; set; } = default!;
    public string? AlternateName { get; set; }
    public string? TaxId { get; set; }
    public CustomerType Type { get; set; } = CustomerType.CORPORATE;
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? AlternateAddress { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public bool Active { get; set; } = true;
    public string? CustomDataJson { get; set; }
}
