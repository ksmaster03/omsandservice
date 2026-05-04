using Mapster;
using MapsterMapper;
using Microsoft.Extensions.DependencyInjection;

namespace TD.OmsService.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var config = TypeAdapterConfig.GlobalSettings;
        config.Scan(typeof(ApplicationAssemblyMarker).Assembly);
        services.AddSingleton(config);
        services.AddScoped<IMapper, ServiceMapper>();

        // Service registrations go here as Phase 2+ modules land.
        return services;
    }
}
