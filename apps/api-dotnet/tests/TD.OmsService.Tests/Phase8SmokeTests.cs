using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Wms;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Phase 8 — newly ported features that previously stayed on Node.
/// WMS active integration uses the MockWmsAdapter by default (Wms:BaseUrl
/// is empty in test config), so these checks exercise the service-layer
/// orchestration + WmsSyncLogger persistence without needing a live WMS.
/// </summary>
public sealed class Phase8SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public Phase8SmokeTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Wms_Status_ReportsMockMode()
    {
        using var scope = _factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IWmsService>();
        var status = await svc.StatusAsync(CancellationToken.None);
        status.Mode.Should().Be("mock");
        status.Connected.Should().BeTrue();
    }

    [Fact]
    public async Task Wms_GetParts_ReturnsMockPartsAndLogsSync()
    {
        using var scope = _factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IWmsService>();
        var parts = await svc.GetPartsAsync(CancellationToken.None);
        parts.Should().NotBeEmpty();
        parts.Any(p => p.Name == "R-MX-T100").Should().BeTrue();

        // Sync log persisted
        var logs = await svc.ListSyncLogsAsync(new TD.OmsService.Application.Common.PageQuery(1, 5), CancellationToken.None);
        logs.Items.Any(l => l.Entity == "parts" && l.Status == TD.OmsService.Domain.Common.SyncStatus.SUCCESS).Should().BeTrue();
    }

    [Fact]
    public async Task Wms_SyncProducts_PreviewMode_DoesNotMutate()
    {
        using var scope = _factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IWmsService>();
        var resp = await svc.SyncProductsAsync(new SyncProductsRequest("preview", null), CancellationToken.None);
        resp.Mode.Should().Be("preview");
        resp.Summary.Created.Should().Be(0);
        resp.Results.Should().NotBeEmpty();
        // every result should detect a brand + category for to_create entries
        resp.Results.Where(r => r.Status == "to_create")
            .Should().OnlyContain(r => r.DetectedBrand != null && r.DetectedCategory != null);
    }

    [Fact]
    public async Task Wms_ScanIn_ReturnsPushResult()
    {
        using var scope = _factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IWmsService>();
        var result = await svc.ScanInAsync(new ScanInRequest("CTN-001", "ZONE-A"), CancellationToken.None);
        result.Should().NotBeNull();

        var logs = await svc.ListSyncLogsAsync(new TD.OmsService.Application.Common.PageQuery(1, 5), CancellationToken.None);
        logs.Items.Any(l => l.Entity == "scan_in" && l.Status == TD.OmsService.Domain.Common.SyncStatus.SUCCESS).Should().BeTrue();
    }
}
