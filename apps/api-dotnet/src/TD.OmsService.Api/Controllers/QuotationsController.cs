using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Quotations;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/quotations")]
[Authorize(Policy = "Staff")]
public sealed class QuotationsController(IQuotationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<QuotationListItem>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(new PageQuery(page, pageSize, search), ct);
        return Ok(ApiResponse<PagedResult<QuotationListItem>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<QuotationDto>>> Get(string id, CancellationToken ct)
    {
        var q = await service.GetAsync(id, ct);
        return q is null
            ? NotFound(ApiResponse<QuotationDto>.Failure("NOT_FOUND", $"Quotation {id} not found"))
            : Ok(ApiResponse<QuotationDto>.Success(q));
    }
}
