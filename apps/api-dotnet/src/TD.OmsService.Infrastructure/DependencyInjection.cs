using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Abstractions;
using TD.OmsService.Application.Assets;
using TD.OmsService.Application.Auth;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.CustomerPortal;
using TD.OmsService.Application.Feedbacks;
using TD.OmsService.Application.Leads;
using TD.OmsService.Application.Pdf;
using TD.OmsService.Application.PmSchedules;
using TD.OmsService.Application.Products;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Application.Renewals;
using TD.OmsService.Application.Reports;
using TD.OmsService.Application.Rmas;
using TD.OmsService.Application.SalesOrders;
using TD.OmsService.Application.ServiceAgreements;
using TD.OmsService.Application.ServiceTickets;
using TD.OmsService.Application.Stock;
using TD.OmsService.Application.Tech;
using TD.OmsService.Application.Users;
using TD.OmsService.Application.Wms;
using TD.OmsService.Infrastructure.Assets;
using TD.OmsService.Infrastructure.Auth;
using TD.OmsService.Infrastructure.Customers;
using TD.OmsService.Infrastructure.CustomerPortal;
using TD.OmsService.Infrastructure.Feedbacks;
using TD.OmsService.Infrastructure.Leads;
using TD.OmsService.Infrastructure.Pdf;
using TD.OmsService.Infrastructure.PmSchedules;
using TD.OmsService.Infrastructure.Products;
using TD.OmsService.Infrastructure.Quotations;
using TD.OmsService.Infrastructure.Renewals;
using TD.OmsService.Infrastructure.Reports;
using TD.OmsService.Infrastructure.Rmas;
using TD.OmsService.Infrastructure.SalesOrders;
using TD.OmsService.Infrastructure.ServiceAgreements;
using TD.OmsService.Infrastructure.ServiceTickets;
using TD.OmsService.Infrastructure.Stock;
using TD.OmsService.Infrastructure.Storage;
using TD.OmsService.Infrastructure.Tech;
using TD.OmsService.Infrastructure.Users;
using TD.OmsService.Infrastructure.Wms;

namespace TD.OmsService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // ── Cross-cutting (Phase 1) ──
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Storage backend — local disk (dev/default) or S3 (prod). Switching
        // backends requires nothing in app code besides flipping Storage:Backend
        // in config; the IFileStorageService contract is identical.
        var storageBackend = config["Storage:Backend"] ?? "local";
        if (storageBackend.Equals("s3", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IFileStorageService, S3FileStorageService>();
        else
            services.AddSingleton<IFileStorageService, LocalFileStorageService>();

        services.AddHttpClient();
        services.AddScoped<IExternalAuthClient, ExternalAuthClient>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IQuotePdfGenerator, QuestPdfQuoteGenerator>();

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

        // ── Phase 6: Reports / Feedback / Stock / WMS ──
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<IStockService, StockService>();

        // ── Active WMS adapter (post-Phase-7 port) ──
        // Pick adapter by Wms:BaseUrl presence: configured = live, missing = mock.
        // LiveWmsAdapter is a singleton so apiKey + authSid persist across
        // requests. MockWmsAdapter is stateless. Switch via Wms:BaseUrl
        // (set even to a sentinel like "from-db" if the real URL lives in
        // the Settings table — LiveWmsAdapter re-reads at auth time).
        var wmsBaseUrl = config["Wms:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(wmsBaseUrl))
            services.AddSingleton<IWmsAdapter, LiveWmsAdapter>();
        else
            services.AddScoped<IWmsAdapter, MockWmsAdapter>();
        services.AddScoped<IWmsService, WmsService>();

        return services;
    }
}
