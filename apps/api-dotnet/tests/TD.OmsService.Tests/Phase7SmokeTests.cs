using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TD.OmsService.Application.Pdf;
using Xunit;

namespace TD.OmsService.Tests;

/// <summary>
/// Sanity check the QuestPDF replacement for the Node puppeteer renderer.
/// Builds a synthetic QuotePdfInput and verifies the generator returns a
/// non-trivial PDF byte stream starting with the %PDF magic. We don't bring
/// up Postgres for this — the IQuotePdfGenerator is a pure DI service.
/// </summary>
public sealed class Phase7SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public Phase7SmokeTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public void QuotePdfGenerator_Renders_NonEmptyPdf()
    {
        using var scope = _factory.Services.CreateScope();
        var pdf = scope.ServiceProvider.GetRequiredService<IQuotePdfGenerator>();

        var input = new QuotePdfInput(
            QuoteNo: "QT-PARITY-0001",
            CreatedAt: new DateTime(2026, 1, 1),
            ValidUntil: new DateTime(2026, 1, 31),
            Status: "DRAFT",
            Customer: new QuotePdfCustomer("ลูกค้าทดสอบ จำกัด", "0123456789012", "1 Sukhumvit Rd, Bangkok", "คุณทดสอบ", "081-234-5678", "test@example.com"),
            Sales: new QuotePdfSales("Sales Tester", "sales@nbasport.co.th"),
            Items: new[]
            {
                new QuotePdfLineItem("ลู่วิ่งไฟฟ้า MAXNUM Pro", "TM-PRO-01", 2, 49000m, 2000m, 96000m),
                new QuotePdfLineItem("ดัมเบลปรับน้ำหนัก", "DB-ADJ-50", 5, 8500m, 0m, 42500m),
            },
            Subtotal: 138500m,
            Discount: 2000m,
            VatRate: 7m,
            Vat: 9555m,
            Total: 146055m);

        var bytes = pdf.Render(input);
        bytes.Should().NotBeEmpty();
        bytes.Length.Should().BeGreaterThan(2000); // a real PDF has thousands of bytes
        System.Text.Encoding.ASCII.GetString(bytes, 0, 4).Should().Be("%PDF");
    }
}
