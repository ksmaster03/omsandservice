using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.SalesOrders;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/sales-orders")]
[Authorize(Policy = "Staff")]
public sealed class SalesOrdersController(ISalesOrderService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<SalesOrderListItem>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(new PageQuery(page, pageSize, search), ct);
        return Ok(ApiResponse<PagedResult<SalesOrderListItem>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> Get(string id, CancellationToken ct)
    {
        var so = await service.GetAsync(id, ct);
        return so is null
            ? NotFound(ApiResponse<SalesOrderDto>.Failure("NOT_FOUND", $"SalesOrder {id} not found"))
            : Ok(ApiResponse<SalesOrderDto>.Success(so));
    }
}
