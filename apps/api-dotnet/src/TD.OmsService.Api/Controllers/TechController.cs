using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Application.Tech;
using TD.OmsService.Domain.Common;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/tech")]
[Authorize(Policy = "Staff")]
public sealed class TechController(ITechService service, ICurrentUser current) : ControllerBase
{
    [HttpGet("tickets")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TechTicketItem>>>> MyTickets(CancellationToken ct)
    {
        if (current.UserId is null) return Unauthorized(ApiResponse<IReadOnlyList<TechTicketItem>>.Failure("UNAUTHORIZED", "No user"));
        return Ok(ApiResponse<IReadOnlyList<TechTicketItem>>.Success(await service.MyTicketsAsync(current.UserId, ct)));
    }

    [HttpGet("pm-jobs")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TechPmItem>>>> MyPmJobs(CancellationToken ct)
    {
        if (current.UserId is null) return Unauthorized(ApiResponse<IReadOnlyList<TechPmItem>>.Failure("UNAUTHORIZED", "No user"));
        return Ok(ApiResponse<IReadOnlyList<TechPmItem>>.Success(await service.MyPmJobsAsync(current.UserId, ct)));
    }

    [HttpPost("tickets/{id}/stage")]
    public async Task<ActionResult<ApiResponse<ServiceTicketDto>>> UpdateStage(
        string id, [FromBody] UpdateTicketStageRequest req, CancellationToken ct)
    {
        if (current.UserId is null) return Unauthorized(ApiResponse<ServiceTicketDto>.Failure("UNAUTHORIZED", "No user"));
        var t = await service.UpdateTicketStageAsync(current.UserId, id, req.Stage, ct);
        return t is null
            ? NotFound(ApiResponse<ServiceTicketDto>.Failure("NOT_FOUND", $"Ticket {id} not assigned to you or missing"))
            : Ok(ApiResponse<ServiceTicketDto>.Success(t));
    }

    [HttpPost("location")]
    public async Task<ActionResult<ApiResponse<object>>> ReportLocation(
        [FromBody] GpsLocationReport report, CancellationToken ct)
    {
        if (current.UserId is null) return Unauthorized(ApiResponse<object>.Failure("UNAUTHORIZED", "No user"));
        await service.RecordLocationAsync(current.UserId, report, ct);
        return Ok(ApiResponse<object>.Success(new { recorded = true }));
    }
}
