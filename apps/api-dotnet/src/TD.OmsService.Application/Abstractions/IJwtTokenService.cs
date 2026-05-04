using System.Security.Claims;

namespace TD.OmsService.Application.Abstractions;

public interface IJwtTokenService
{
    string CreateStaffToken(string userId, string email, string role, IEnumerable<Claim>? extra = null);
    string CreateCustomerToken(string customerId, string customerUserId);
    ClaimsPrincipal? Validate(string token);
}
