using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Auth;

/// <summary>
/// Mirrors apps/api/src/routes/{auth,customer-auth}.ts. Customer OTP keeps
/// the Node dev-bypass behaviour (any 6-digit code accepted) so frontend
/// doesn't need to branch by backend during the migration. Production OTP
/// wiring (persisted code + ISmsSender) is a TODO.
/// </summary>
public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IExternalAuthClient external) : IAuthService
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
        return Mint(customerUser);
    }

    public async Task<CustomerLoginResponse?> LoginWithGoogleAsync(CustomerGoogleLoginRequest req, CancellationToken ct)
    {
        var profile = await external.VerifyGoogleIdTokenAsync(req.IdToken, ct);
        if (!profile.EmailVerified) return null;
        return await ResolveOrCreateExternalLoginAsync(profile, ct);
    }

    public async Task<CustomerLoginResponse?> LoginWithLineAsync(CustomerLineLoginRequest req, CancellationToken ct)
    {
        var profile = await external.VerifyLineIdTokenAsync(req.IdToken, ct);
        return await ResolveOrCreateExternalLoginAsync(profile, ct);
    }

    /// <summary>
    /// Match the verified external profile to a CustomerUser. Resolution order
    /// mirrors Node's customer-auth.ts:
    ///   1. Existing CustomerUser with this LINE/Google subject id (lineUserId or email).
    ///   2. CustomerUser with matching email (Google).
    ///   3. Customer (master) with matching email → bootstrap CustomerUser.
    ///   4. Otherwise reject — sales must register the customer first.
    /// </summary>
    private async Task<CustomerLoginResponse?> ResolveOrCreateExternalLoginAsync(ExternalProfile profile, CancellationToken ct)
    {
        CustomerUser? cu = null;
        if (profile.Provider == "line")
        {
            cu = await db.CustomerUsers.FirstOrDefaultAsync(x => x.LineUserId == profile.SubjectId, ct);
        }
        if (cu is null && !string.IsNullOrEmpty(profile.Email))
        {
            cu = await db.CustomerUsers.FirstOrDefaultAsync(x => x.Email == profile.Email, ct);
        }
        if (cu is null && !string.IsNullOrEmpty(profile.Email))
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Email == profile.Email, ct);
            if (customer is null) return null;

            cu = new CustomerUser
            {
                Id = Guid.NewGuid().ToString(),
                CustomerId = customer.Id,
                Email = profile.Email,
                LineUserId = profile.Provider == "line" ? profile.SubjectId : null,
                DisplayName = string.IsNullOrEmpty(profile.Name) ? customer.Name : profile.Name,
                AvatarUrl = profile.PictureUrl,
                LastLoginAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            };
            db.CustomerUsers.Add(cu);
        }
        if (cu is null) return null;

        if (profile.Provider == "line" && string.IsNullOrEmpty(cu.LineUserId)) cu.LineUserId = profile.SubjectId;
        if (string.IsNullOrEmpty(cu.AvatarUrl) && !string.IsNullOrEmpty(profile.PictureUrl)) cu.AvatarUrl = profile.PictureUrl;
        cu.LastLoginAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Mint(cu);
    }

    private CustomerLoginResponse Mint(CustomerUser cu)
    {
        var token = jwt.CreateCustomerToken(cu.CustomerId, cu.Id);
        return new CustomerLoginResponse(token, new CustomerSummary(
            cu.CustomerId, cu.Id, cu.Phone ?? string.Empty, cu.DisplayName));
    }
}
