using Microsoft.AspNetCore.Mvc;
using TD.OmsService.Api.Common;
using TD.OmsService.Application.Auth;

namespace TD.OmsService.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        [FromBody] LoginRequest req, CancellationToken ct)
    {
        var result = await auth.LoginStaffAsync(req, ct);
        return result is null
            ? Unauthorized(ApiResponse<LoginResponse>.Failure("INVALID_CREDENTIALS", "Email or password is incorrect"))
            : Ok(ApiResponse<LoginResponse>.Success(result));
    }
}

[ApiController]
[Route("api/v1/customer/auth")]
public sealed class CustomerAuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("otp/request")]
    public async Task<ActionResult<ApiResponse<object>>> RequestOtp(
        [FromBody] CustomerOtpRequest req, CancellationToken ct)
    {
        await auth.RequestCustomerOtpAsync(req, ct);
        return Ok(ApiResponse<object>.Success(new { sent = true }));
    }

    [HttpPost("otp/verify")]
    public async Task<ActionResult<ApiResponse<CustomerLoginResponse>>> Verify(
        [FromBody] CustomerOtpVerify req, CancellationToken ct)
    {
        var result = await auth.VerifyCustomerOtpAsync(req, ct);
        return result is null
            ? Unauthorized(ApiResponse<CustomerLoginResponse>.Failure("INVALID_OTP", "OTP code is invalid or expired"))
            : Ok(ApiResponse<CustomerLoginResponse>.Success(result));
    }

    [HttpPost("google")]
    public async Task<ActionResult<ApiResponse<CustomerLoginResponse>>> Google(
        [FromBody] CustomerGoogleLoginRequest req, CancellationToken ct)
    {
        try
        {
            var result = await auth.LoginWithGoogleAsync(req, ct);
            return result is null
                ? Unauthorized(ApiResponse<CustomerLoginResponse>.Failure("NOT_REGISTERED", "Email is not registered as a customer. Please contact sales."))
                : Ok(ApiResponse<CustomerLoginResponse>.Success(result));
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(ApiResponse<CustomerLoginResponse>.Failure("INVALID_GOOGLE_TOKEN", ex.Message));
        }
    }

    [HttpPost("line")]
    public async Task<ActionResult<ApiResponse<CustomerLoginResponse>>> Line(
        [FromBody] CustomerLineLoginRequest req, CancellationToken ct)
    {
        try
        {
            var result = await auth.LoginWithLineAsync(req, ct);
            return result is null
                ? Unauthorized(ApiResponse<CustomerLoginResponse>.Failure("NOT_REGISTERED", "LINE account not linked to a customer. Please contact sales."))
                : Ok(ApiResponse<CustomerLoginResponse>.Success(result));
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(ApiResponse<CustomerLoginResponse>.Failure("INVALID_LINE_TOKEN", ex.Message));
        }
    }
}
