using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Customers;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Customers;

/// <summary>
/// Phase 2 reference: Customer CRUD against the scaffolded EF model. The
/// scaffold skips the Postgres-native enum column `Customer.type`, so this
/// service does not currently expose CustomerType — it will land alongside
/// Phase 3 work via Npgsql NpgsqlDataSourceBuilder.MapEnum&lt;CustomerType&gt;().
/// </summary>
public sealed class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<PagedResult<CustomerListItem>> ListAsync(int page, int pageSize, string? search, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Customers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(c =>
                EF.Functions.ILike(c.Name, $"%{s}%") ||
                (c.Phone != null && EF.Functions.ILike(c.Phone, $"%{s}%")) ||
                (c.Email != null && EF.Functions.ILike(c.Email, $"%{s}%")));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerListItem(c.Id, c.Name, c.Phone, c.Email, c.Active))
            .ToListAsync(ct);

        return new PagedResult<CustomerListItem>(items, total, page, pageSize);
    }

    public async Task<CustomerDto?> GetAsync(string id, CancellationToken ct)
    {
        var c = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : Map(c);
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest req, CancellationToken ct)
    {
        var entity = new Customer
        {
            Id = Guid.NewGuid().ToString(),
            Name = req.Name,
            WmsCode = req.WmsCode,
            AlternateName = req.AlternateName,
            TaxId = req.TaxId,
            ContactName = req.ContactName,
            Phone = req.Phone,
            Email = req.Email,
            Address = req.Address,
            Lat = req.Lat,
            Lng = req.Lng,
            Active = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Customers.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<CustomerDto?> UpdateAsync(string id, UpdateCustomerRequest req, CancellationToken ct)
    {
        var entity = await db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null) return null;
        entity.Name = req.Name;
        entity.WmsCode = req.WmsCode;
        entity.AlternateName = req.AlternateName;
        entity.TaxId = req.TaxId;
        entity.ContactName = req.ContactName;
        entity.Phone = req.Phone;
        entity.Email = req.Email;
        entity.Address = req.Address;
        entity.Lat = req.Lat;
        entity.Lng = req.Lng;
        entity.Active = req.Active;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var entity = await db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null) return false;
        entity.Active = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static CustomerDto Map(Customer c) => new(
        c.Id, c.WmsCode, c.Name, c.AlternateName, c.TaxId, c.ContactName,
        c.Phone, c.Email, c.Address, c.Lat, c.Lng, c.Active, c.CreatedAt, c.UpdatedAt);
}
