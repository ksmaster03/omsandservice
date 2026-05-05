using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Assets;
using TD.OmsService.Application.Auth;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.CustomerPortal;
using TD.OmsService.Application.Leads;
using TD.OmsService.Application.PmSchedules;
using TD.OmsService.Application.Products;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Application.Renewals;
using TD.OmsService.Application.Rmas;
using TD.OmsService.Application.SalesOrders;
using TD.OmsService.Application.ServiceAgreements;
using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Application.Tech;
using TD.OmsService.Application.Users;
using TD.OmsService.Infrastructure.Assets;
using TD.OmsService.Infrastructure.Auth;
using TD.OmsService.Infrastructure.Customers;
using TD.OmsService.Infrastructure.CustomerPortal;
using TD.OmsService.Infrastructure.Leads;
using TD.OmsService.Infrastructure.PmSchedules;
using TD.OmsService.Infrastructure.Products;
using TD.OmsService.Infrastructure.Quotations;
using TD.OmsService.Infrastructure.Renewals;
using TD.OmsService.Infrastructure.Rmas;
using TD.OmsService.Infrastructure.SalesOrders;
using TD.OmsService.Infrastructure.ServiceAgreements;
using TD.OmsService.Infrastructure.ServiceTickets;
using TD.OmsService.Infrastructure.Storage;
using TD.OmsService.Infrastructure.Tech;
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

        // ── Phase 3: Sales Flow ──
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<IQuotationService, QuotationService>();
        services.AddScoped<ISalesOrderService, SalesOrderService>();

        // ── Phase 4: After-Sales + Tech ──
        services.AddScoped<IServiceTicketService, ServiceTicketService>();
        services.AddScoped<IAssetService, AssetService>();
        services.AddScoped<IPmScheduleService, PmScheduleService>();
        services.AddScoped<IRmaService, RmaService>();
        services.AddScoped<IRenewalService, RenewalService>();
        services.AddScoped<IServiceAgreementService, ServiceAgreementService>();
        services.AddScoped<ITechService, TechService>();
        // ITechHubBroadcaster is registered in the Api project (SignalR-backed).

        // ── Phase 5: Customer Portal ──
        services.AddScoped<ICustomerPortalService, CustomerPortalService>();

        return services;
    }
}
