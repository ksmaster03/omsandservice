using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Application.Customers;
using TD.OmsService.Infrastructure.Auth;
using TD.OmsService.Infrastructure.Customers;
using TD.OmsService.Infrastructure.Storage;

namespace TD.OmsService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // ── Cross-cutting (Phase 1) ──
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IAuthService, AuthService>();

        // ── Phase 2: Master Data ──
        services.AddScoped<ICustomerService, CustomerService>();
        // services.AddScoped<IProductService, ProductService>();
        // services.AddScoped<IUserService, UserService>();

        return services;
    }
}
