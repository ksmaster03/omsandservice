using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Products;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Products;

public sealed class ProductService(AppDbContext db) : IProductService
{
    public async Task<PagedResult<ProductListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, $"%{s}%") ||
                EF.Functions.ILike(p.Sku, $"%{s}%") ||
                EF.Functions.ILike(p.Category, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Sku)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(p => new ProductListItem(p.Id, p.Sku, p.Name, p.Category, p.Price, p.Active))
            .ToListAsync(ct);
        return new PagedResult<ProductListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<ProductDto?> GetAsync(string id, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : Map(p);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest req, CancellationToken ct)
    {
        var entity = new Product
        {
            Id = Guid.NewGuid().ToString(),
            Sku = req.Sku,
            Name = req.Name,
            Category = req.Category,
            Price = req.Price,
            WarrantyMonths = req.WarrantyMonths,
            PmIntervalMonths = req.PmIntervalMonths,
            Uom = req.Uom,
            WmsPartNo = req.WmsPartNo,
            PartType = req.PartType,
            StandardPack = req.StandardPack,
            Active = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<ProductDto?> UpdateAsync(string id, UpdateProductRequest req, CancellationToken ct)
    {
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return null;
        entity.Sku = req.Sku;
        entity.Name = req.Name;
        entity.Category = req.Category;
        entity.Price = req.Price;
        entity.WarrantyMonths = req.WarrantyMonths;
        entity.PmIntervalMonths = req.PmIntervalMonths;
        entity.Uom = req.Uom;
        entity.WmsPartNo = req.WmsPartNo;
        entity.PartType = req.PartType;
        entity.StandardPack = req.StandardPack;
        entity.Active = req.Active;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return false;
        entity.Active = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static ProductDto Map(Product p) => new(
        p.Id, p.Sku, p.Name, p.Category, p.Price, p.WarrantyMonths,
        p.PmIntervalMonths, p.WmsPartNo, p.PartType, p.Uom,
        p.StandardPack, p.Active, p.CreatedAt, p.UpdatedAt);
}
