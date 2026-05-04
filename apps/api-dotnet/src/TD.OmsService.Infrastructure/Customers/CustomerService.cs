using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Customers;
using TD.OmsService.Domain.Entities;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Customers;

/// <summary>
/// Reference implementation of the Phase 2 module pattern.
/// Once DbContext scaffolding adds DbSet&lt;Customer&gt;, switch the in-memory stub
/// below to db.Customers calls — controller/service contract stays identical.
/// </summary>
public sealed class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<PagedResult<CustomerListItem>> ListAsync(int page, int pageSize, string? search, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Set<Customer>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerListItem(c.Id, c.Name, c.Type, c.Phone, c.Email, c.Active))
            .ToListAsync(ct);

        return new PagedResult<CustomerListItem>(items, total, page, pageSize);
    }

    public async Task<CustomerDto?> GetAsync(string id, CancellationToken ct)
    {
        var c = await db.Set<Customer>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : Map(c);
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest req, CancellationToken ct)
    {
        var entity = new Customer
        {
            Name = req.Name,
            Type = req.Type,
            WmsCode = req.WmsCode,
            AlternateName = req.AlternateName,
            TaxId = req.TaxId,
            ContactName = req.ContactName,
            Phone = req.Phone,
            Email = req.Email,
            Address = req.Address,
            Lat = req.Lat,
            Lng = req.Lng,
        };
        db.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<CustomerDto?> UpdateAsync(string id, UpdateCustomerRequest req, CancellationToken ct)
    {
        var entity = await db.Set<Customer>().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null) return null;
        entity.Name = req.Name;
        entity.Type = req.Type;
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
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var entity = await db.Set<Customer>().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null) return false;
        entity.Active = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static CustomerDto Map(Customer c) => new(
        c.Id, c.WmsCode, c.Name, c.AlternateName, c.TaxId, c.Type,
        c.ContactName, c.Phone, c.Email, c.Address,
        c.Lat, c.Lng, c.Active, c.CreatedAt, c.UpdatedAt);
}
