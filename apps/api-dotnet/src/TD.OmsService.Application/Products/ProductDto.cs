namespace TD.OmsService.Application.Products;

public sealed record ProductDto(
    string Id,
    string Code,
    string Name,
    string? Description,
    string? Category,
    string? Brand,
    string? Unit,
    decimal? StandardPrice,
    bool Active,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateProductRequest(
    string Code,
    string Name,
    string? Description,
    string? Category,
    string? Brand,
    string? Unit,
    decimal? StandardPrice);

public sealed record UpdateProductRequest(
    string Code,
    string Name,
    string? Description,
    string? Category,
    string? Brand,
    string? Unit,
    decimal? StandardPrice,
    bool Active);

public sealed record ProductListItem(string Id, string Code, string Name, string? Brand, decimal? StandardPrice, bool Active);
