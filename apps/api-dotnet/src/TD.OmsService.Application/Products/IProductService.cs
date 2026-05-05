using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Products;

public interface IProductService
{
    Task<PagedResult<ProductListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<ProductDto?> GetAsync(string id, CancellationToken ct);
    Task<ProductDto> CreateAsync(CreateProductRequest req, CancellationToken ct);
    Task<ProductDto?> UpdateAsync(string id, UpdateProductRequest req, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
}
