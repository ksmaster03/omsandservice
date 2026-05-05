namespace TD.OmsService.Application.Stock;

public sealed record StockItemDto(string Id, string ProductId, string ProductSku, string ProductName, int OnHand, int Reserved, int Available, int ReorderAt);

public sealed record SetStockRequest(string ProductId, int OnHand, int? ReorderAt);

public sealed record AdjustStockRequest(string ProductId, int Delta, string? Reason);
