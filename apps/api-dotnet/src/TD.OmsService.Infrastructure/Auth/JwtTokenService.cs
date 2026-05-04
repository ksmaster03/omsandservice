using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TD.OmsService.Application.Abstractions;

namespace TD.OmsService.Infrastructure.Auth;

public sealed class JwtTokenService(IConfiguration config) : IJwtTokenService
{
    private readonly string _secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret missing");
    private readonly string _issuer = config["Jwt:Issuer"] ?? "td-oms-service";
    private readonly string _audience = config["Jwt:Audience"] ?? "td-oms-clients";
    private readonly int _expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 480;

    public string CreateStaffToken(string userId, string email, string role, IEnumerable<Claim>? extra = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Role, role),
            new("kind", "staff"),
        };
        if (extra is not null) claims.AddRange(extra);
        return Build(claims);
    }

    public string CreateCustomerToken(string customerId, string customerUserId)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, customerUserId),
            new Claim("customerId", customerId),
            new Claim("kind", "customer"),
        };
        return Build(claims);
    }

    public ClaimsPrincipal? Validate(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _issuer,
                ValidAudience = _audience,
                IssuerSigningKey = key,
            }, out _);
        }
        catch
        {
            return null;
        }
    }

    private string Build(IEnumerable<Claim> claims)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expiryMinutes),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
