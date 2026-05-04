using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Customers;

namespace TD.OmsService.Api.Controllers;

/// <summary>
/// Reference controller for Phase 2 — mirrors the Fastify route shape under
/// /api/v1/internal/customers. Returns the existing { ok, data } envelope so
/// frontends can switch backends transparently via the gateway.
/// </summary>
[ApiController]
[Route("api/v1/internal/customers")]
[Authorize(Policy = "Staff")]
public sealed class CustomersController(ICustomerService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<CustomerListItem>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(page, pageSize, search, ct);
        return Ok(ApiResponse<PagedResult<CustomerListItem>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Get(string id, CancellationToken ct)
    {
        var c = await service.GetAsync(id, ct);
        return c is null
            ? NotFound(ApiResponse<CustomerDto>.Failure("NOT_FOUND", $"Customer {id} not found"))
            : Ok(ApiResponse<CustomerDto>.Success(c));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Create(
        [FromBody] CreateCustomerRequest req,
        CancellationToken ct)
    {
        var created = await service.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<CustomerDto>.Success(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Update(
        string id,
        [FromBody] UpdateCustomerRequest req,
        CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, req, ct);
        return updated is null
            ? NotFound(ApiResponse<CustomerDto>.Failure("NOT_FOUND", $"Customer {id} not found"))
            : Ok(ApiResponse<CustomerDto>.Success(updated));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(string id, CancellationToken ct)
    {
        var ok = await service.DeleteAsync(id, ct);
        return ok
            ? Ok(ApiResponse<object>.Success(new { id, deleted = true }))
            : NotFound(ApiResponse<object>.Failure("NOT_FOUND", $"Customer {id} not found"));
    }
}
