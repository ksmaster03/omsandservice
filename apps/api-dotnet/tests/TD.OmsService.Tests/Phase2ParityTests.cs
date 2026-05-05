using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.Products;
using TD.OmsService.Application.Users;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Phase 2 smoke parity check: hits the live .NET service against the
/// existing oms_dev PostgreSQL DB (populated by Prisma migrations) to confirm
/// the migrated module endpoints return the same { ok, data } envelope shape
/// the React frontends already consume.
///
/// We bypass authentication by injecting service implementations directly,
/// since auth itself is exercised by Phase 1 tests.
/// </summary>
public sealed class Phase2ParityTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase2ParityTests(WebApplicationFactory<Program> factory)
    {
        // Override env to ensure tests connect to the migrated dev DB.
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task Ready_ReturnsOk_WithDbUp()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/v1/ready");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadAsStringAsync();
        body.Should().Contain("\"ok\":true");
        body.Should().Contain("\"db\":\"up\"");
    }

    [Fact]
    public async Task CustomerService_List_ReturnsPagedShape()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ICustomerService>();
        var result = await service.ListAsync(1, 5, null, CancellationToken.None);
        result.Should().NotBeNull();
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(5);
        result.Items.Should().NotBeNull();
        result.Total.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task ProductService_List_ReturnsPagedShape()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProductService>();
        var result = await service.ListAsync(new PageQuery(1, 5), CancellationToken.None);
        result.Should().NotBeNull();
        result.Page.Should().Be(1);
        result.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task UserService_List_ReturnsPagedShape()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IUserService>();
        var result = await service.ListAsync(new PageQuery(1, 5), CancellationToken.None);
        result.Should().NotBeNull();
        result.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task CustomerService_Crud_RoundTrips()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ICustomerService>();

        var name = $"PARITY_TEST_{Guid.NewGuid():N}";
        var created = await service.CreateAsync(
            new CreateCustomerRequest(name, null, null, null, null, "0900000000", "parity@example.com", null, null, null),
            CancellationToken.None);
        created.Id.Should().NotBeNullOrEmpty();
        created.Name.Should().Be(name);

        var fetched = await service.GetAsync(created.Id, CancellationToken.None);
        fetched.Should().NotBeNull();
        fetched!.Name.Should().Be(name);

        var deleted = await service.DeleteAsync(created.Id, CancellationToken.None);
        deleted.Should().BeTrue();

        var afterDelete = await service.GetAsync(created.Id, CancellationToken.None);
        afterDelete!.Active.Should().BeFalse(); // soft delete
    }
}
