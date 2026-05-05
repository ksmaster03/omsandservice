using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Customers;

public sealed record CustomerDto(
    string Id,
    string? WmsCode,
    string Name,
    string? AlternateName,
    string? TaxId,
    CustomerType Type,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    decimal? Lat,
    decimal? Lng,
    bool Active,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateCustomerRequest(
    string Name,
    CustomerType Type,
    string? WmsCode,
    string? AlternateName,
    string? TaxId,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    decimal? Lat,
    decimal? Lng);

public sealed record UpdateCustomerRequest(
    string Name,
    CustomerType Type,
    string? WmsCode,
    string? AlternateName,
    string? TaxId,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    decimal? Lat,
    decimal? Lng,
    bool Active);

public sealed record CustomerListItem(string Id, string Name, CustomerType Type, string? Phone, string? Email, bool Active);
