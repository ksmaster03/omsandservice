using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Auth;

/// <summary>
/// Mirrors apps/api/src/routes/{auth,customer-auth}.ts. Customer OTP keeps
/// the Node dev-bypass behaviour (any 6-digit code accepted) so frontend
/// doesn't need to branch by backend during the migration. Production wiring
/// is a TODO — replace with persisted OtpCode + ISmsSender.
/// </summary>
public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt) : IAuthService
{
    public async Task<LoginResponse?> LoginStaffAsync(LoginRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.Active, ct);
        if (user is null) return null;
        if (!hasher.Verify(req.Password, user.PasswordHash)) return null;
        var role = user.Role.ToString();
        var token = jwt.CreateStaffToken(user.Id, user.Email, role);
        return new LoginResponse(token, new UserSummary(user.Id, user.Email, user.Name, role));
    }

    public Task RequestCustomerOtpAsync(CustomerOtpRequest req, CancellationToken ct)
    {
        // Dev: any 6-digit code accepted. Prod: persist OTP + send via ISmsSender.
        return Task.CompletedTask;
    }

    public async Task<CustomerLoginResponse?> VerifyCustomerOtpAsync(CustomerOtpVerify req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Phone) || req.Code is not { Length: 6 } || !req.Code.All(char.IsDigit))
            return null;

        // Find existing CustomerUser, or look up the Customer by phone and bootstrap one.
        var customerUser = await db.CustomerUsers.FirstOrDefaultAsync(cu => cu.Phone == req.Phone, ct);
        if (customerUser is null)
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Phone == req.Phone, ct);
            if (customer is null) return null;

            customerUser = new CustomerUser
            {
                Id = Guid.NewGuid().ToString(),
                CustomerId = customer.Id,
                Phone = req.Phone,
                DisplayName = string.IsNullOrEmpty(customer.ContactName) ? customer.Name : customer.ContactName,
                LastLoginAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            };
            db.CustomerUsers.Add(customerUser);
        }
        else
        {
            customerUser.LastLoginAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);

        var token = jwt.CreateCustomerToken(customerUser.CustomerId, customerUser.Id);
        return new CustomerLoginResponse(token, new CustomerSummary(
            customerUser.CustomerId, customerUser.Id, customerUser.Phone ?? string.Empty, customerUser.DisplayName));
    }
}
