using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Assets;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.PmSchedules;
using TD.OmsService.Application.Renewals;
using TD.OmsService.Application.Rmas;
using TD.OmsService.Application.ServiceAgreements;
using TD.OmsService.Application.ServiceTickets;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/tickets")]
[Authorize(Policy = "Staff")]
public sealed class ServiceTicketsController(IServiceTicketService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ServiceTicketListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<ServiceTicketListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize, search), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ServiceTicketDto>>> Get(string id, CancellationToken ct)
    {
        var t = await service.GetAsync(id, ct);
        return t is null
            ? NotFound(ApiResponse<ServiceTicketDto>.Failure("NOT_FOUND", $"Ticket {id} not found"))
            : Ok(ApiResponse<ServiceTicketDto>.Success(t));
    }

    [HttpPatch("{id}/stage")]
    public async Task<ActionResult<ApiResponse<ServiceTicketDto>>> UpdateStage(string id, [FromBody] UpdateTicketStageRequest req, CancellationToken ct)
    {
        var t = await service.UpdateStageAsync(id, req, ct);
        return t is null ? NotFound(ApiResponse<ServiceTicketDto>.Failure("NOT_FOUND", $"Ticket {id} not found")) : Ok(ApiResponse<ServiceTicketDto>.Success(t));
    }

    [HttpPatch("{id}/assign")]
    public async Task<ActionResult<ApiResponse<ServiceTicketDto>>> Assign(string id, [FromBody] AssignTechRequest req, CancellationToken ct)
    {
        var t = await service.AssignTechAsync(id, req, ct);
        return t is null ? NotFound(ApiResponse<ServiceTicketDto>.Failure("NOT_FOUND", $"Ticket {id} not found")) : Ok(ApiResponse<ServiceTicketDto>.Success(t));
    }
}

[ApiController]
[Route("api/v1/internal/assets")]
[Authorize(Policy = "Staff")]
public sealed class AssetsController(IAssetService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AssetListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<AssetListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize, search), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<AssetDto>>> Get(string id, CancellationToken ct)
    {
        var a = await service.GetAsync(id, ct);
        return a is null ? NotFound(ApiResponse<AssetDto>.Failure("NOT_FOUND", $"Asset {id} not found")) : Ok(ApiResponse<AssetDto>.Success(a));
    }

    [HttpGet("by-customer/{customerId}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AssetListItem>>>> ListByCustomer(string customerId, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<AssetListItem>>.Success(await service.ListByCustomerAsync(customerId, ct)));
}

[ApiController]
[Route("api/v1/internal/pm-schedules")]
[Authorize(Policy = "Staff")]
public sealed class PmSchedulesController(IPmScheduleService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PmScheduleListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<PmScheduleListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PmScheduleDto>>> Get(string id, CancellationToken ct)
    {
        var p = await service.GetAsync(id, ct);
        return p is null ? NotFound(ApiResponse<PmScheduleDto>.Failure("NOT_FOUND", $"PM {id} not found")) : Ok(ApiResponse<PmScheduleDto>.Success(p));
    }
}

[ApiController]
[Route("api/v1/internal/rmas")]
[Authorize(Policy = "Staff")]
public sealed class RmasController(IRmaService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<RmaListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<RmaListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize, search), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RmaDto>>> Get(string id, CancellationToken ct)
    {
        var r = await service.GetAsync(id, ct);
        return r is null ? NotFound(ApiResponse<RmaDto>.Failure("NOT_FOUND", $"RMA {id} not found")) : Ok(ApiResponse<RmaDto>.Success(r));
    }

    [HttpPatch("{id}/stage")]
    public async Task<ActionResult<ApiResponse<RmaDto>>> UpdateStage(string id, [FromBody] UpdateRmaStageRequest req, CancellationToken ct)
    {
        var r = await service.UpdateStageAsync(id, req, ct);
        return r is null ? NotFound(ApiResponse<RmaDto>.Failure("NOT_FOUND", $"RMA {id} not found")) : Ok(ApiResponse<RmaDto>.Success(r));
    }
}

[ApiController]
[Route("api/v1/internal/renewals")]
[Authorize(Policy = "Staff")]
public sealed class RenewalsController(IRenewalService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<RenewalListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<RenewalListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RenewalDto>>> Get(string id, CancellationToken ct)
    {
        var r = await service.GetAsync(id, ct);
        return r is null ? NotFound(ApiResponse<RenewalDto>.Failure("NOT_FOUND", $"Renewal {id} not found")) : Ok(ApiResponse<RenewalDto>.Success(r));
    }
}

[ApiController]
[Route("api/v1/internal/service-agreements")]
[Authorize(Policy = "Staff")]
public sealed class ServiceAgreementsController(IServiceAgreementService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ServiceAgreementListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<ServiceAgreementListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize), ct)));

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ServiceAgreementDto>>> Get(string id, CancellationToken ct)
    {
        var a = await service.GetAsync(id, ct);
        return a is null ? NotFound(ApiResponse<ServiceAgreementDto>.Failure("NOT_FOUND", $"Agreement {id} not found")) : Ok(ApiResponse<ServiceAgreementDto>.Success(a));
    }
}
