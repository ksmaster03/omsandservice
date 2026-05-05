using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TD.OmsService.Api.Common;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class HealthController(AppDbContext db) : ControllerBase
{
    /// <summary>Basic liveness probe — returns OK if the process is up.</summary>
    [HttpGet("ping")]
    public ActionResult<ApiResponse<object>> Ping() =>
        Ok(ApiResponse<object>.Success(new { pong = true, ts = DateTimeOffset.UtcNow }));

    /// <summary>Readiness probe — checks DB connectivity.</summary>
    [HttpGet("ready")]
    public async Task<ActionResult<ApiResponse<object>>> Ready(CancellationToken ct)
    {
        var canConnect = await db.Database.CanConnectAsync(ct);
        if (!canConnect)
            return StatusCode(503, ApiResponse<object>.Failure("DB_UNREACHABLE", "Database connection failed"));
        return Ok(ApiResponse<object>.Success(new { db = "up", ts = DateTimeOffset.UtcNow }));
    }
}
