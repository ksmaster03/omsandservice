using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Auth;

/// <summary>
/// Mirrors apps/api/src/routes/auth.ts (staff) + customer-auth.ts (OTP flow).
/// OTP delivery is stubbed — wire to SMS provider in Phase 1 finalization.
/// Note: User.role is a Postgres enum and not yet on the scaffolded entity;
/// role claim is currently best-effort via a lookup table or "STAFF" until
/// we add the enum mapping (planned alongside Phase 3 LeadStage etc.).
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
        // TODO: persist OtpCode + ISmsSender (Twilio/SNS)
        return Task.CompletedTask;
    }

    public Task<CustomerLoginResponse?> VerifyCustomerOtpAsync(CustomerOtpVerify req, CancellationToken ct)
    {
        // TODO: lookup OtpCode + mint customer token
        return Task.FromResult<CustomerLoginResponse?>(null);
    }
}
