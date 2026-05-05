using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Stock;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Stock;

public sealed class StockService(AppDbContext db) : IStockService
{
    public async Task<IReadOnlyList<StockItemDto>> ListAsync(CancellationToken ct)
    {
        return await db.StockItems.AsNoTracking()
            .Include(s => s.Product)
            .OrderBy(s => s.Product.Sku)
            .Select(s => new StockItemDto(
                s.Id, s.ProductId, s.Product.Sku, s.Product.Name,
                s.OnHand, s.Reserved, s.OnHand - s.Reserved, s.ReorderAt))
            .ToListAsync(ct);
    }

    public async Task<StockItemDto?> GetByProductAsync(string productId, CancellationToken ct)
    {
        return await db.StockItems.AsNoTracking()
            .Where(s => s.ProductId == productId)
            .Include(s => s.Product)
            .Select(s => new StockItemDto(
                s.Id, s.ProductId, s.Product.Sku, s.Product.Name,
                s.OnHand, s.Reserved, s.OnHand - s.Reserved, s.ReorderAt))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<StockItemDto> SetAsync(SetStockRequest req, CancellationToken ct)
    {
        var item = await db.StockItems.FirstOrDefaultAsync(s => s.ProductId == req.ProductId, ct);
        if (item is null)
        {
            item = new StockItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = req.ProductId,
                OnHand = req.OnHand,
                Reserved = 0,
                ReorderAt = req.ReorderAt ?? 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.StockItems.Add(item);
        }
        else
        {
            item.OnHand = req.OnHand;
            if (req.ReorderAt.HasValue) item.ReorderAt = req.ReorderAt.Value;
            item.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return await GetByProductAsync(req.ProductId, ct) ?? throw new InvalidOperationException("Stock save failed");
    }

    public async Task<StockItemDto?> AdjustAsync(AdjustStockRequest req, CancellationToken ct)
    {
        var item = await db.StockItems.FirstOrDefaultAsync(s => s.ProductId == req.ProductId, ct);
        if (item is null) return null;
        item.OnHand = Math.Max(0, item.OnHand + req.Delta);
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return await GetByProductAsync(req.ProductId, ct);
    }
}
