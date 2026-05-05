using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Feedbacks;
using TD.OmsService.Application.Reports;
using TD.OmsService.Application.Stock;
using TD.OmsService.Application.Wms;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/reports")]
[Authorize(Policy = "Staff")]
public sealed class ReportsController(IReportsService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> Dashboard(CancellationToken ct) =>
        Ok(ApiResponse<DashboardSummaryDto>.Success(await service.DashboardAsync(ct)));

    [HttpGet("sales-pipeline")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SalesPipelineCountDto>>>> SalesPipeline(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<SalesPipelineCountDto>>.Success(await service.SalesPipelineAsync(ct)));

    [HttpGet("top-sellers")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductTopSellerDto>>>> TopSellers([FromQuery] int limit = 10, CancellationToken ct = default) =>
        Ok(ApiResponse<IReadOnlyList<ProductTopSellerDto>>.Success(await service.TopSellersAsync(limit, ct)));

    [HttpGet("tickets-by-stage")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TicketsByStageDto>>>> TicketsByStage(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<TicketsByStageDto>>.Success(await service.TicketsByStageAsync(ct)));
}

[ApiController]
[Route("api/v1/feedback")]
public sealed class FeedbackController(IFeedbackService service, ICurrentUser current) : ControllerBase
{
    /// <summary>Anonymous create — frontend submits feedback without auth.</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<FeedbackDto>>> Create([FromBody] CreateFeedbackRequest req, CancellationToken ct)
    {
        var f = await service.CreateAsync(req, current.UserId, ct);
        return Ok(ApiResponse<FeedbackDto>.Success(f));
    }

    [HttpGet]
    [Authorize(Policy = "Staff")]
    public async Task<ActionResult<ApiResponse<PagedResult<FeedbackListItem>>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<FeedbackListItem>>.Success(await service.ListAsync(new PageQuery(page, pageSize, search), ct)));

    [HttpGet("{id}")]
    [Authorize(Policy = "Staff")]
    public async Task<ActionResult<ApiResponse<FeedbackDto>>> Get(string id, CancellationToken ct)
    {
        var f = await service.GetAsync(id, ct);
        return f is null
            ? NotFound(ApiResponse<FeedbackDto>.Failure("NOT_FOUND", $"Feedback {id} not found"))
            : Ok(ApiResponse<FeedbackDto>.Success(f));
    }

    [HttpPatch("{id}")]
    [Authorize(Policy = "Staff")]
    public async Task<ActionResult<ApiResponse<FeedbackDto>>> Update(string id, [FromBody] UpdateFeedbackRequest req, CancellationToken ct)
    {
        var f = await service.UpdateAsync(id, req, ct);
        return f is null
            ? NotFound(ApiResponse<FeedbackDto>.Failure("NOT_FOUND", $"Feedback {id} not found"))
            : Ok(ApiResponse<FeedbackDto>.Success(f));
    }
}

[ApiController]
[Route("api/v1/internal/stock")]
[Authorize(Policy = "Staff")]
public sealed class StockController(IStockService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StockItemDto>>>> List(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<StockItemDto>>.Success(await service.ListAsync(ct)));

    [HttpGet("by-product/{productId}")]
    public async Task<ActionResult<ApiResponse<StockItemDto>>> Get(string productId, CancellationToken ct)
    {
        var s = await service.GetByProductAsync(productId, ct);
        return s is null
            ? NotFound(ApiResponse<StockItemDto>.Failure("NOT_FOUND", $"Stock for product {productId} not found"))
            : Ok(ApiResponse<StockItemDto>.Success(s));
    }

    [HttpPost("set")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ApiResponse<StockItemDto>>> Set([FromBody] SetStockRequest req, CancellationToken ct) =>
        Ok(ApiResponse<StockItemDto>.Success(await service.SetAsync(req, ct)));

    [HttpPost("adjust")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ApiResponse<StockItemDto>>> Adjust([FromBody] AdjustStockRequest req, CancellationToken ct)
    {
        var s = await service.AdjustAsync(req, ct);
        return s is null
            ? NotFound(ApiResponse<StockItemDto>.Failure("NOT_FOUND", $"Stock for product {req.ProductId} not found"))
            : Ok(ApiResponse<StockItemDto>.Success(s));
    }
}

[ApiController]
[Route("api/v1/internal/wms")]
[Authorize(Policy = "Admin")]
public sealed class WmsController(IWmsService service) : ControllerBase
{
    [HttpGet("sync-logs")]
    public async Task<ActionResult<ApiResponse<PagedResult<WmsSyncLogDto>>>> SyncLogs(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        Ok(ApiResponse<PagedResult<WmsSyncLogDto>>.Success(await service.ListSyncLogsAsync(new PageQuery(page, pageSize), ct)));

    [HttpGet("stock-cache")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WmsStockCacheDto>>>> StockCache(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<WmsStockCacheDto>>.Success(await service.StockCacheAsync(ct)));
}
