namespace TD.OmsService.Application.Auth;

public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string Token, UserSummary User);
public sealed record UserSummary(string Id, string Email, string Name, string Role);

public sealed record CustomerOtpRequest(string Phone);
public sealed record CustomerOtpVerify(string Phone, string Code);
public sealed record CustomerLoginResponse(string Token, CustomerSummary Customer);
public sealed record CustomerSummary(string CustomerId, string CustomerUserId, string Phone, string? Name);
