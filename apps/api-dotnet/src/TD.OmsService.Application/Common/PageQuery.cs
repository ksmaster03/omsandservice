namespace TD.OmsService.Application.Common;

/// <summary>Common shape for paginated list endpoints.</summary>
public sealed record PageQuery(int Page = 1, int PageSize = 20, string? Search = null)
{
    public int SafePage => Math.Max(1, Page);
    public int SafePageSize => Math.Clamp(PageSize, 1, 100);
}
