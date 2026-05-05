using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Pdf;
using TD.OmsService.Application.Quotations;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/quotations")]
[Authorize(Policy = "Staff")]
public sealed class QuotationsController(IQuotationService service, IQuotePdfGenerator pdf) : ControllerBase
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

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<QuotationDto>>> UpdateStatus(string id, [FromBody] UpdateQuoteStatusRequest req, CancellationToken ct)
    {
        var updated = await service.UpdateStatusAsync(id, req, ct);
        return updated is null
            ? NotFound(ApiResponse<QuotationDto>.Failure("NOT_FOUND", $"Quotation {id} not found"))
            : Ok(ApiResponse<QuotationDto>.Success(updated));
    }

    /// <summary>
    /// Render the quotation PDF inline. Replaces the puppeteer-based endpoint
    /// in Node — same QuotePdfInput shape, ported via QuestPDF.
    /// </summary>
    [HttpGet("{id}/pdf")]
    [Produces("application/pdf")]
    public async Task<IActionResult> Pdf(string id, CancellationToken ct)
    {
        var input = await service.BuildPdfInputAsync(id, ct);
        if (input is null) return NotFound();
        var bytes = pdf.Render(input);
        return File(bytes, "application/pdf", $"{input.QuoteNo}.pdf");
    }
}
