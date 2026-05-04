namespace TD.OmsService.Application.Auth;

public interface IAuthService
{
    Task<LoginResponse?> LoginStaffAsync(LoginRequest req, CancellationToken ct);
    Task RequestCustomerOtpAsync(CustomerOtpRequest req, CancellationToken ct);
    Task<CustomerLoginResponse?> VerifyCustomerOtpAsync(CustomerOtpVerify req, CancellationToken ct);
}
