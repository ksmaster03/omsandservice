using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Leads;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/leads")]
[Authorize(Policy = "Staff")]
public sealed class LeadsController(ILeadService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<LeadListItem>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(new PageQuery(page, pageSize, search), ct);
        return Ok(ApiResponse<PagedResult<LeadListItem>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<LeadDto>>> Get(string id, CancellationToken ct)
    {
        var lead = await service.GetAsync(id, ct);
        return lead is null
            ? NotFound(ApiResponse<LeadDto>.Failure("NOT_FOUND", $"Lead {id} not found"))
            : Ok(ApiResponse<LeadDto>.Success(lead));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<LeadDto>>> Create([FromBody] CreateLeadRequest req, CancellationToken ct)
    {
        var created = await service.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<LeadDto>.Success(created));
    }

    [HttpPatch("{id}/stage")]
    public async Task<ActionResult<ApiResponse<LeadDto>>> UpdateStage(string id, [FromBody] UpdateLeadStageRequest req, CancellationToken ct)
    {
        var updated = await service.UpdateStageAsync(id, req, ct);
        return updated is null
            ? NotFound(ApiResponse<LeadDto>.Failure("NOT_FOUND", $"Lead {id} not found"))
            : Ok(ApiResponse<LeadDto>.Success(updated));
    }
}
