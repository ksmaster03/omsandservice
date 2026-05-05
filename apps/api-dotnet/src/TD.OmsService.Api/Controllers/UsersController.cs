using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Users;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/internal/users")]
[Authorize(Policy = "Admin")]
public sealed class UsersController(IUserService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<UserDto>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await service.ListAsync(new PageQuery(page, pageSize, search), ct);
        return Ok(ApiResponse<PagedResult<UserDto>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Get(string id, CancellationToken ct)
    {
        var u = await service.GetAsync(id, ct);
        return u is null
            ? NotFound(ApiResponse<UserDto>.Failure("NOT_FOUND", $"User {id} not found"))
            : Ok(ApiResponse<UserDto>.Success(u));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] CreateUserRequest req, CancellationToken ct)
    {
        var created = await service.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<UserDto>.Success(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(string id, [FromBody] UpdateUserRequest req, CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, req, ct);
        return updated is null
            ? NotFound(ApiResponse<UserDto>.Failure("NOT_FOUND", $"User {id} not found"))
            : Ok(ApiResponse<UserDto>.Success(updated));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(string id, CancellationToken ct)
    {
        var ok = await service.DeleteAsync(id, ct);
        return ok
            ? Ok(ApiResponse<object>.Success(new { id, deleted = true }))
            : NotFound(ApiResponse<object>.Failure("NOT_FOUND", $"User {id} not found"));
    }

    [HttpPost("{id}/change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword(string id, [FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        var ok = await service.ChangePasswordAsync(id, req, ct);
        return ok
            ? Ok(ApiResponse<object>.Success(new { changed = true }))
            : BadRequest(ApiResponse<object>.Failure("INVALID_PASSWORD", "Current password is incorrect or user not found"));
    }
}
