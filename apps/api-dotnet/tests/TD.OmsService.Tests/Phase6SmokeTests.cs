using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Feedbacks;
using TD.OmsService.Application.Reports;
using TD.OmsService.Application.Stock;
using TD.OmsService.Application.Wms;
using TD.OmsService.Domain.Common;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>Phase 6 smoke checks: reports/feedback/stock/wms aggregation queries.</summary>
public sealed class Phase6SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase6SmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task Reports_Dashboard_ReturnsCounts()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IReportsService>();
        var dash = await s.DashboardAsync(CancellationToken.None);
        dash.Should().NotBeNull();
        dash.CustomerCount.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task Reports_SalesPipeline_GroupsByStage()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IReportsService>();
        (await s.SalesPipelineAsync(CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Reports_TicketsByStage_RunsAfterEnumMapping()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IReportsService>();
        (await s.TicketsByStageAsync(CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Feedback_Create_AndList_RoundTrip()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IFeedbackService>();
        var f = await s.CreateAsync(
            new CreateFeedbackRequest(FeedbackType.IMPROVEMENT, "PARITY",
                "smoke-test feedback", FeedbackPriority.LOW, null, "test", null, null, null),
            null, CancellationToken.None);
        f.Type.Should().Be(FeedbackType.IMPROVEMENT);
        f.Status.Should().Be(FeedbackStatus.OPEN);

        var page = await s.ListAsync(new PageQuery(1, 5), CancellationToken.None);
        page.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Stock_List_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IStockService>();
        (await s.ListAsync(CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Wms_SyncLogs_RunsWithoutError()
    {
        using var scope = _factory.Services.CreateScope();
        var s = scope.ServiceProvider.GetRequiredService<IWmsService>();
        (await s.ListSyncLogsAsync(new PageQuery(1, 10), CancellationToken.None)).Should().NotBeNull();
    }
}
