using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.Leads;
using TD.OmsService.Application.Users;
using TD.OmsService.Domain.Common;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Exercise Phase 3 write paths now that Postgres native enums are mapped
/// via NpgsqlDataSourceBuilder. Validates the LeadStage state machine and
/// asserts invalid transitions are rejected.
/// </summary>
public sealed class Phase3WriteTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase3WriteTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task Lead_Create_AdvanceStages_RoundTrip()
    {
        using var scope = _factory.Services.CreateScope();
        var customers = scope.ServiceProvider.GetRequiredService<ICustomerService>();
        var users = scope.ServiceProvider.GetRequiredService<IUserService>();
        var leads = scope.ServiceProvider.GetRequiredService<ILeadService>();

        // Seed prerequisites
        var cust = await customers.CreateAsync(
            new CreateCustomerRequest($"PARITY_LEAD_CUST_{Guid.NewGuid():N}", CustomerType.CORPORATE,
                null, null, null, null, null, null, null, null, null),
            CancellationToken.None);
        var owner = await users.CreateAsync(
            new CreateUserRequest($"sales-{Guid.NewGuid():N}@parity.test", "Parity Sales", "p4ssw0rd!parity",
                UserRole.SALES, null, null),
            CancellationToken.None);

        var lead = await leads.CreateAsync(
            new CreateLeadRequest(cust.Id, owner.Id, 99000m, DateTime.UtcNow.AddDays(30), "parity test"),
            CancellationToken.None);
        lead.Stage.Should().Be(LeadStage.LEAD);

        var qualified = await leads.UpdateStageAsync(lead.Id, new UpdateLeadStageRequest(LeadStage.QUALIFIED), CancellationToken.None);
        qualified!.Stage.Should().Be(LeadStage.QUALIFIED);

        var demo = await leads.UpdateStageAsync(lead.Id, new UpdateLeadStageRequest(LeadStage.DEMO), CancellationToken.None);
        demo!.Stage.Should().Be(LeadStage.DEMO);

        // Invalid jump: DEMO → WON should be rejected
        Func<Task> badJump = () => leads.UpdateStageAsync(lead.Id, new UpdateLeadStageRequest(LeadStage.WON), CancellationToken.None);
        await badJump.Should().ThrowAsync<InvalidOperationException>();

        // LOST is allowed from any non-terminal stage
        var lost = await leads.UpdateStageAsync(lead.Id, new UpdateLeadStageRequest(LeadStage.LOST), CancellationToken.None);
        lost!.Stage.Should().Be(LeadStage.LOST);

        // Cleanup
        await customers.DeleteAsync(cust.Id, CancellationToken.None);
        await users.DeleteAsync(owner.Id, CancellationToken.None);
    }

    [Fact]
    public async Task Customer_Type_Enum_RoundTrips()
    {
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ICustomerService>();

        var name = $"PARITY_TYPE_{Guid.NewGuid():N}";
        var c = await service.CreateAsync(
            new CreateCustomerRequest(name, CustomerType.INDIVIDUAL,
                null, null, null, null, null, null, null, null, null),
            CancellationToken.None);
        c.Type.Should().Be(CustomerType.INDIVIDUAL);

        var refetched = await service.GetAsync(c.Id, CancellationToken.None);
        refetched!.Type.Should().Be(CustomerType.INDIVIDUAL);

        await service.DeleteAsync(c.Id, CancellationToken.None);
    }
}
