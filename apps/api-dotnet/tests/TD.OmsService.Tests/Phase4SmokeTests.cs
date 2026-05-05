using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Assets;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.PmSchedules;
using TD.OmsService.Application.Renewals;
using TD.OmsService.Application.Rmas;
using TD.OmsService.Application.ServiceAgreements;
using TD.OmsService.Application.ServiceTickets;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>Phase 4 read-only smoke check across all After-Sales modules.</summary>
public sealed class Phase4SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase4SmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task ServiceTickets_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IServiceTicketService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Assets_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IAssetService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task PmSchedules_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IPmScheduleService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Rmas_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IRmaService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Renewals_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IRenewalService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task ServiceAgreements_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IServiceAgreementService>();
        (await s.ListAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }
}
