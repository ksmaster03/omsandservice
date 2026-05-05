using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Products;
using TD.OmsService.Domain.Entities;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Products;

public sealed class ProductService(AppDbContext db) : IProductService
{
    public async Task<PagedResult<ProductListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Set<Product>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(s) ||
                p.Code.ToLower().Contains(s) ||
                (p.Brand != null && p.Brand.ToLower().Contains(s)));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Code)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(p => new ProductListItem(p.Id, p.Code, p.Name, p.Brand, p.StandardPrice, p.Active))
            .ToListAsync(ct);
        return new PagedResult<ProductListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<ProductDto?> GetAsync(string id, CancellationToken ct)
    {
        var p = await db.Set<Product>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : Map(p);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest req, CancellationToken ct)
    {
        var entity = new Product
        {
            Code = req.Code,
            Name = req.Name,
            Description = req.Description,
            Category = req.Category,
            Brand = req.Brand,
            Unit = req.Unit,
            StandardPrice = req.StandardPrice,
        };
        db.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<ProductDto?> UpdateAsync(string id, UpdateProductRequest req, CancellationToken ct)
    {
        var entity = await db.Set<Product>().FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return null;
        entity.Code = req.Code;
        entity.Name = req.Name;
        entity.Description = req.Description;
        entity.Category = req.Category;
        entity.Brand = req.Brand;
        entity.Unit = req.Unit;
        entity.StandardPrice = req.StandardPrice;
        entity.Active = req.Active;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var entity = await db.Set<Product>().FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return false;
        entity.Active = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static ProductDto Map(Product p) => new(
        p.Id, p.Code, p.Name, p.Description, p.Category, p.Brand, p.Unit,
        p.StandardPrice, p.Active, p.CreatedAt, p.UpdatedAt);
}
