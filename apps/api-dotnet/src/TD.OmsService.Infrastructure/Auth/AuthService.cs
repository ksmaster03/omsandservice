using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Domain.Entities;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Auth;

/// <summary>
/// Mirrors apps/api/src/routes/auth.ts (staff) + customer-auth.ts (OTP flow).
/// OTP delivery is stubbed — wire to SMS provider (e.g. AWS SNS, Twilio) in Phase 1.
/// </summary>
public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt) : IAuthService
{
    public async Task<LoginResponse?> LoginStaffAsync(LoginRequest req, CancellationToken ct)
    {
        var user = await db.Set<User>().FirstOrDefaultAsync(u => u.Email == req.Email && u.Active, ct);
        if (user is null) return null;
        if (!hasher.Verify(req.Password, user.PasswordHash)) return null;
        var token = jwt.CreateStaffToken(user.Id, user.Email, user.Role.ToString());
        return new LoginResponse(token, new UserSummary(user.Id, user.Email, user.Name, user.Role.ToString()));
    }

    public Task RequestCustomerOtpAsync(CustomerOtpRequest req, CancellationToken ct)
    {
        // TODO Phase 1: generate 6-digit code, persist to OtpCode table with TTL,
        // hand off to ISmsSender. For now no-op stub — verify accepts dev code.
        return Task.CompletedTask;
    }

    public Task<CustomerLoginResponse?> VerifyCustomerOtpAsync(CustomerOtpVerify req, CancellationToken ct)
    {
        // TODO Phase 1: lookup OtpCode where phone+code valid+unexpired,
        // resolve CustomerUser, mint customer token. Stubbed for now.
        return Task.FromResult<CustomerLoginResponse?>(null);
    }
}
