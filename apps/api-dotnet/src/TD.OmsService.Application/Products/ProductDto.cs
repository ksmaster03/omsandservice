namespace TD.OmsService.Application.Products;

public sealed record ProductDto(
    string Id,
    string Sku,
    string Name,
    string Category,
    decimal Price,
    int WarrantyMonths,
    int PmIntervalMonths,
    string? WmsPartNo,
    string? PartType,
    string Uom,
    int? StandardPack,
    bool Active,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateProductRequest(
    string Sku,
    string Name,
    string Category,
    decimal Price,
    int WarrantyMonths,
    int PmIntervalMonths,
    string Uom,
    string? WmsPartNo,
    string? PartType,
    int? StandardPack);

public sealed record UpdateProductRequest(
    string Sku,
    string Name,
    string Category,
    decimal Price,
    int WarrantyMonths,
    int PmIntervalMonths,
    string Uom,
    string? WmsPartNo,
    string? PartType,
    int? StandardPack,
    bool Active);

public sealed record ProductListItem(string Id, string Sku, string Name, string Category, decimal Price, bool Active);
