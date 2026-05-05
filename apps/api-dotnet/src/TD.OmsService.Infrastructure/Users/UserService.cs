using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Users;
using TD.OmsService.Domain.Entities;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Users;

public sealed class UserService(AppDbContext db, IPasswordHasher hasher) : IUserService
{
    public async Task<PagedResult<UserDto>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Set<User>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(u =>
                u.Name.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.Name)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(u => new UserDto(u.Id, u.Email, u.Name, u.Phone, u.Role, u.Skills, u.Active, u.CreatedAt, u.UpdatedAt))
            .ToListAsync(ct);
        return new PagedResult<UserDto>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<UserDto?> GetAsync(string id, CancellationToken ct)
    {
        var u = await db.Set<User>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return u is null ? null : Map(u);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest req, CancellationToken ct)
    {
        var entity = new User
        {
            Email = req.Email.ToLowerInvariant(),
            Name = req.Name,
            Phone = req.Phone,
            Role = req.Role,
            PasswordHash = hasher.Hash(req.Password),
            Skills = req.Skills?.ToList() ?? new List<string>(),
        };
        db.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<UserDto?> UpdateAsync(string id, UpdateUserRequest req, CancellationToken ct)
    {
        var entity = await db.Set<User>().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity is null) return null;
        entity.Email = req.Email.ToLowerInvariant();
        entity.Name = req.Name;
        entity.Role = req.Role;
        entity.Phone = req.Phone;
        entity.Skills = req.Skills?.ToList() ?? entity.Skills;
        entity.Active = req.Active;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var entity = await db.Set<User>().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity is null) return false;
        entity.Active = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(string id, ChangePasswordRequest req, CancellationToken ct)
    {
        var entity = await db.Set<User>().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity is null) return false;
        if (!hasher.Verify(req.CurrentPassword, entity.PasswordHash)) return false;
        entity.PasswordHash = hasher.Hash(req.NewPassword);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static UserDto Map(User u) => new(
        u.Id, u.Email, u.Name, u.Phone, u.Role, u.Skills, u.Active, u.CreatedAt, u.UpdatedAt);
}
