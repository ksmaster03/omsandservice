namespace TD.OmsService.Api.Common;

/// <summary>
/// Mirrors the existing Fastify response envelope: { ok, data?, error? }.
/// Frontend code already expects this shape — keeping parity avoids client churn.
/// </summary>
public sealed record ApiResponse<T>(bool Ok, T? Data, ApiError? Error)
{
    public static ApiResponse<T> Success(T data) => new(true, data, null);
    public static ApiResponse<T> Failure(string code, string message) =>
        new(false, default, new ApiError(code, message));
}

public sealed record ApiError(string Code, string Message, object? Details = null);
