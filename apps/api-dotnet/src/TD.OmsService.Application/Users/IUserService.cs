using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Users;

public interface IUserService
{
    Task<PagedResult<UserDto>> ListAsync(PageQuery q, CancellationToken ct);
    Task<UserDto?> GetAsync(string id, CancellationToken ct);
    Task<UserDto> CreateAsync(CreateUserRequest req, CancellationToken ct);
    Task<UserDto?> UpdateAsync(string id, UpdateUserRequest req, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<bool> ChangePasswordAsync(string id, ChangePasswordRequest req, CancellationToken ct);
}
