using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Auth;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.Leads;
using TD.OmsService.Application.Products;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Application.SalesOrders;
using TD.OmsService.Application.Users;
using TD.OmsService.Infrastructure.Auth;
using TD.OmsService.Infrastructure.Customers;
using TD.OmsService.Infrastructure.Leads;
using TD.OmsService.Infrastructure.Products;
using TD.OmsService.Infrastructure.Quotations;
using TD.OmsService.Infrastructure.SalesOrders;
using TD.OmsService.Infrastructure.Storage;
using TD.OmsService.Infrastructure.Users;

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
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IUserService, UserService>();

        // ── Phase 3: Sales Flow (read-only stubs) ──
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<IQuotationService, QuotationService>();
        services.AddScoped<ISalesOrderService, SalesOrderService>();

        return services;
    }
}
