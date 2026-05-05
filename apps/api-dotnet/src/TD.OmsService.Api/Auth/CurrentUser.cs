using System.Security.Claims;
using TD.OmsService.Application.Abstractions;

namespace TD.OmsService.Api.Auth;

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;
    public string? UserId => Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? Principal?.FindFirst("sub")?.Value;
    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value
                            ?? Principal?.FindFirst("email")?.Value;
    public string? Role => Principal?.FindFirst(ClaimTypes.Role)?.Value
                           ?? Principal?.FindFirst("role")?.Value;
    public string? Kind => Principal?.FindFirst("kind")?.Value;
    public string? CustomerId => Principal?.FindFirst("customerId")?.Value;
    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;
}
