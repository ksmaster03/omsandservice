using System.Text.Json;
using FluentValidation;
using TD.OmsService.Api.Common;

namespace TD.OmsService.Api.Middleware;

/// <summary>
/// Catches uncaught exceptions and emits the same { ok, error } envelope the
/// Fastify API uses, so frontends don't need conditional handling per backend.
/// </summary>
public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (ValidationException vex)
        {
            await WriteAsync(ctx, StatusCodes.Status400BadRequest, "VALIDATION_ERROR", vex.Message,
                vex.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage }));
        }
        catch (UnauthorizedAccessException)
        {
            await WriteAsync(ctx, StatusCodes.Status401Unauthorized, "UNAUTHORIZED", "Not authenticated");
        }
        catch (KeyNotFoundException kex)
        {
            await WriteAsync(ctx, StatusCodes.Status404NotFound, "NOT_FOUND", kex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            var msg = env.IsDevelopment() ? ex.Message : "Internal server error";
            await WriteAsync(ctx, StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", msg);
        }
    }

    private static async Task WriteAsync(HttpContext ctx, int status, string code, string message, object? details = null)
    {
        if (ctx.Response.HasStarted) return;
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        var payload = new ApiResponse<object>(false, null, new ApiError(code, message, details));
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        }));
    }
}
