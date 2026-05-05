namespace TD.OmsService.Application.Auth;

public sealed record CustomerGoogleLoginRequest(string IdToken);
public sealed record CustomerLineLoginRequest(string IdToken);

public interface IAuthService
{
    Task<LoginResponse?> LoginStaffAsync(LoginRequest req, CancellationToken ct);
    Task RequestCustomerOtpAsync(CustomerOtpRequest req, CancellationToken ct);
    Task<CustomerLoginResponse?> VerifyCustomerOtpAsync(CustomerOtpVerify req, CancellationToken ct);
    Task<CustomerLoginResponse?> LoginWithGoogleAsync(CustomerGoogleLoginRequest req, CancellationToken ct);
    Task<CustomerLoginResponse?> LoginWithLineAsync(CustomerLineLoginRequest req, CancellationToken ct);
}
