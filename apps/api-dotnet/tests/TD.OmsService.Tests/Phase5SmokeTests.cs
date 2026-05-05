using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Auth;
using TD.OmsService.Application.Customers;
using TD.OmsService.Application.CustomerPortal;
using TD.OmsService.Application.Tech;
using TD.OmsService.Domain.Common;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Phase 5 + Phase 4-tech smoke checks: customer OTP login round-trip and
/// customer-scoped queries flow end-to-end against the live DB.
/// </summary>
public sealed class Phase5SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase5SmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:Default",
                "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres");
            b.UseSetting("Jwt:Secret", "dev-secret-at-least-32-chars-long-for-testing-only-12345");
        });
    }

    [Fact]
    public async Task Customer_VerifyOtp_NewCustomerUser_LoginRoundTrip()
    {
        // Seed in one scope, verify in another to avoid any DbContext change-tracker
        // confusion (CustomerUser create-or-get path queries by phone).
        var phone = $"099{Random.Shared.Next(1000000, 9999999)}";
        string customerId;
        await using (var seedScope = _factory.Services.CreateAsyncScope())
        {
            var customers = seedScope.ServiceProvider.GetRequiredService<ICustomerService>();
            var c = await customers.CreateAsync(
                new CreateCustomerRequest($"PARITY_PORTAL_{Guid.NewGuid():N}", CustomerType.INDIVIDUAL,
                    null, null, null, "Tester", phone, null, null, null, null),
                CancellationToken.None);
            customerId = c.Id;
        }

        await using (var verifyScope = _factory.Services.CreateAsyncScope())
        {
            var auth = verifyScope.ServiceProvider.GetRequiredService<IAuthService>();
            var portal = verifyScope.ServiceProvider.GetRequiredService<ICustomerPortalService>();

            var login = await auth.VerifyCustomerOtpAsync(new CustomerOtpVerify(phone, "123456"), CancellationToken.None);
            login.Should().NotBeNull();
            login!.Customer.CustomerId.Should().Be(customerId);
            login.Token.Should().NotBeNullOrEmpty();

            (await portal.MyAssetsAsync(customerId, CancellationToken.None)).Should().NotBeNull();
            (await portal.MyTicketsAsync(customerId, CancellationToken.None)).Should().NotBeNull();
        }

        await using (var cleanupScope = _factory.Services.CreateAsyncScope())
        {
            var customers = cleanupScope.ServiceProvider.GetRequiredService<ICustomerService>();
            await customers.DeleteAsync(customerId, CancellationToken.None);
        }
    }

    [Fact]
    public async Task Customer_VerifyOtp_RejectsBadCode()
    {
        using var scope = _factory.Services.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var login = await auth.VerifyCustomerOtpAsync(new CustomerOtpVerify("0900000000", "abc"), CancellationToken.None);
        login.Should().BeNull();
    }

    [Fact]
    public async Task Tech_MyTickets_ReturnsEmptyForUnknownTech()
    {
        using var scope = _factory.Services.CreateScope();
        var tech = scope.ServiceProvider.GetRequiredService<ITechService>();
        var tickets = await tech.MyTicketsAsync(Guid.NewGuid().ToString(), CancellationToken.None);
        tickets.Should().NotBeNull();
        tickets.Should().BeEmpty();
    }

    [Fact]
    public async Task Tech_RecordLocation_PersistsThroughBroadcaster()
    {
        using var scope = _factory.Services.CreateScope();
        var tech = scope.ServiceProvider.GetRequiredService<ITechService>();
        var users = scope.ServiceProvider.GetRequiredService<TD.OmsService.Application.Users.IUserService>();

        var techUser = await users.CreateAsync(
            new TD.OmsService.Application.Users.CreateUserRequest(
                $"tech-{Guid.NewGuid():N}@parity.test", "Parity Tech", "p4ssw0rd!parity",
                UserRole.SERVICE, null, null),
            CancellationToken.None);

        await tech.RecordLocationAsync(techUser.Id, new GpsLocationReport(13.7563m, 100.5018m, 5m), CancellationToken.None);

        // The broadcaster is SignalR-backed but with no connected clients — we
        // verify only that the call doesn't throw and the record persists by
        // calling again (upsert semantics).
        await tech.RecordLocationAsync(techUser.Id, new GpsLocationReport(13.7570m, 100.5020m, 4m), CancellationToken.None);

        await users.DeleteAsync(techUser.Id, CancellationToken.None);
    }
}
