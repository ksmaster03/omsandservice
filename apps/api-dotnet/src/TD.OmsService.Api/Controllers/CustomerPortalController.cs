using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.CustomerPortal;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/customer")]
[Authorize(Policy = "Customer")]
public sealed class CustomerPortalController(ICustomerPortalService service, ICurrentUser current) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<MyProfileSummary>>> Me(CancellationToken ct)
    {
        if (current.UserId is null) return Unauthorized(ApiResponse<MyProfileSummary>.Failure("UNAUTHORIZED", "No user"));
        var me = await service.MeAsync(current.UserId, ct);
        return me is null
            ? NotFound(ApiResponse<MyProfileSummary>.Failure("NOT_FOUND", "Customer profile not found"))
            : Ok(ApiResponse<MyProfileSummary>.Success(me));
    }

    [HttpGet("assets")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MyAssetItem>>>> MyAssets(CancellationToken ct)
    {
        if (current.CustomerId is null) return Unauthorized(ApiResponse<IReadOnlyList<MyAssetItem>>.Failure("UNAUTHORIZED", "No customer"));
        return Ok(ApiResponse<IReadOnlyList<MyAssetItem>>.Success(await service.MyAssetsAsync(current.CustomerId, ct)));
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MyTicketItem>>>> MyTickets(CancellationToken ct)
    {
        if (current.CustomerId is null) return Unauthorized(ApiResponse<IReadOnlyList<MyTicketItem>>.Failure("UNAUTHORIZED", "No customer"));
        return Ok(ApiResponse<IReadOnlyList<MyTicketItem>>.Success(await service.MyTicketsAsync(current.CustomerId, ct)));
    }

    [HttpGet("renewals")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MyRenewalItem>>>> MyRenewals(CancellationToken ct)
    {
        if (current.CustomerId is null) return Unauthorized(ApiResponse<IReadOnlyList<MyRenewalItem>>.Failure("UNAUTHORIZED", "No customer"));
        return Ok(ApiResponse<IReadOnlyList<MyRenewalItem>>.Success(await service.MyRenewalsAsync(current.CustomerId, ct)));
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<ApiResponse<MyTicketItem>>> CreateTicket([FromBody] CreateMyTicketRequest req, CancellationToken ct)
    {
        if (current.CustomerId is null) return Unauthorized(ApiResponse<MyTicketItem>.Failure("UNAUTHORIZED", "No customer"));
        var t = await service.CreateMyTicketAsync(current.CustomerId, req, ct);
        return Ok(ApiResponse<MyTicketItem>.Success(t));
    }
}
