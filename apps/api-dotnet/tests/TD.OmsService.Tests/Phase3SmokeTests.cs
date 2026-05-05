using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Leads;
using TD.OmsService.Application.Quotations;
using TD.OmsService.Application.SalesOrders;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Phase 3 read-only smoke check: verify the raw-SQL projection that bypasses
/// Postgres native enum columns (LeadStage, QuoteStatus, SOStatus) can list
/// rows from each table without throwing. Empty results are acceptable.
/// </summary>
public sealed class Phase3SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase3SmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task LeadService_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ILeadService>();
        var result = await service.ListAsync(new PageQuery(1, 10), CancellationToken.None);
        result.Should().NotBeNull();
        result.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task QuotationService_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IQuotationService>();
        var result = await service.ListAsync(new PageQuery(1, 10), CancellationToken.None);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task SalesOrderService_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ISalesOrderService>();
        var result = await service.ListAsync(new PageQuery(1, 10), CancellationToken.None);
        result.Should().NotBeNull();
    }
}
