using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Users;

public sealed record UserDto(
    string Id,
    string Email,
    string Name,
    string? Phone,
    UserRole Role,
    IReadOnlyList<string> Skills,
    bool Active,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateUserRequest(
    string Email,
    string Name,
    string Password,
    UserRole Role,
    string? Phone,
    IReadOnlyList<string>? Skills);

public sealed record UpdateUserRequest(
    string Email,
    string Name,
    UserRole Role,
    string? Phone,
    IReadOnlyList<string>? Skills,
    bool Active);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
