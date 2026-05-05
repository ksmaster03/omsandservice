namespace TD.OmsService.Application.Stock;

public interface IStockService
{
    Task<IReadOnlyList<StockItemDto>> ListAsync(CancellationToken ct);
    Task<StockItemDto?> GetByProductAsync(string productId, CancellationToken ct);
    Task<StockItemDto> SetAsync(SetStockRequest req, CancellationToken ct);
    Task<StockItemDto?> AdjustAsync(AdjustStockRequest req, CancellationToken ct);
}
