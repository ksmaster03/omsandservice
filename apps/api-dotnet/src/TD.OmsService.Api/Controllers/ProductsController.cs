using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Products;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/products")]
[Authorize(Policy = "Staff")]
public sealed class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductListItem>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(new PageQuery(page, pageSize, search), ct);
        return Ok(ApiResponse<PagedResult<ProductListItem>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Get(string id, CancellationToken ct)
    {
        var p = await service.GetAsync(id, ct);
        return p is null
            ? NotFound(ApiResponse<ProductDto>.Failure("NOT_FOUND", $"Product {id} not found"))
            : Ok(ApiResponse<ProductDto>.Success(p));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        var created = await service.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<ProductDto>.Success(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(string id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, req, ct);
        return updated is null
            ? NotFound(ApiResponse<ProductDto>.Failure("NOT_FOUND", $"Product {id} not found"))
            : Ok(ApiResponse<ProductDto>.Success(updated));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(string id, CancellationToken ct)
    {
        var ok = await service.DeleteAsync(id, ct);
        return ok
            ? Ok(ApiResponse<object>.Success(new { id, deleted = true }))
            : NotFound(ApiResponse<object>.Failure("NOT_FOUND", $"Product {id} not found"));
    }
}
