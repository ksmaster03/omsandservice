using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TD.OmsService.Application.Pdf;

namespace TD.OmsService.Infrastructure.Pdf;

/// <summary>
/// QuestPDF replacement for the puppeteer-based renderer in apps/api/lib/pdf.ts.
/// Layout intentionally tracks the Node version's brand (NBA Sport — black + red
/// accent + Sarabun-like sans-serif) so quotes look consistent during the
/// migration. Community license is set in Program.cs.
/// </summary>
public sealed class QuestPdfQuoteGenerator : IQuotePdfGenerator
{
    private static readonly CultureInfo Th = new("th-TH");
    private const string BrandRed = "#FF2720";
    private const string BrandNavy = "#0C1016";
    private const string GreyBg = "#F8F9FA";
    private const string GreyBorder = "#E9ECEF";
    private const string GreyText = "#6C757D";

    public byte[] Render(QuotePdfInput input)
    {
        return Document.Create(c => c.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(14, Unit.Millimetre);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(t => t.FontSize(10).FontFamily(Fonts.Calibri));

            page.Header().Element(h => Header(h, input));
            page.Content().Element(b => Body(b, input));
            page.Footer().Element(f => Footer(f));
        })).GeneratePdf();
    }

    private static void Header(QuestPDF.Infrastructure.IContainer h, QuotePdfInput q)
    {
        h.PaddingBottom(10).BorderBottom(2).BorderColor(BrandRed).Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Row(r =>
                {
                    r.AutoItem().Width(40).Height(40).Background(BrandNavy)
                        .AlignCenter().AlignMiddle()
                        .Text("NBA").FontSize(14).Bold().FontColor(BrandRed);
                    r.AutoItem().PaddingLeft(8).AlignMiddle().Column(c =>
                    {
                        c.Item().Text("NBA SPORT").FontSize(13).Bold().FontColor(BrandNavy);
                        c.Item().Text("Fitness Equipment Thailand").FontSize(7).FontColor(GreyText);
                    });
                });
            });

            row.RelativeItem().AlignRight().Column(col =>
            {
                col.Item().AlignRight().Text("ใบเสนอราคา").FontSize(18).Bold().FontColor(BrandNavy);
                col.Item().AlignRight().Text(q.QuoteNo).FontSize(10).Bold().FontColor(BrandRed);
                col.Item().AlignRight().Text($"ออกวันที่ {Date(q.CreatedAt)}").FontSize(8).FontColor("#495057");
                col.Item().AlignRight().Text($"ใช้ได้ถึง {Date(q.ValidUntil)}").FontSize(8).FontColor("#495057");
                col.Item().AlignRight().PaddingTop(3).Text(t =>
                {
                    t.Span(q.Status).FontSize(7).Bold().FontColor("#A87800")
                        .BackgroundColor("#FFF6CC");
                });
            });
        });
    }

    private static void Body(QuestPDF.Infrastructure.IContainer body, QuotePdfInput q)
    {
        body.PaddingVertical(10).Column(col =>
        {
            col.Item().Row(r =>
            {
                r.RelativeItem().Element(c => InfoBox(c, "เสนอให้", q.Customer.Name, BuildCustomerSub(q.Customer)));
                r.ConstantItem(8);
                r.RelativeItem().Element(c => InfoBox(c, "ผู้เสนอ", q.Sales.Name, $"{q.Sales.Email}\nNBA Sport Thailand"));
            });

            col.Item().PaddingTop(10).Element(c => ItemsTable(c, q));
            col.Item().Element(c => Totals(c, q));
            col.Item().PaddingTop(8).Element(c => Terms(c, q));
        });
    }

    private static void InfoBox(QuestPDF.Infrastructure.IContainer c, string heading, string main, string sub)
    {
        c.Background(GreyBg).Border(1).BorderColor(GreyBorder).Padding(10).Column(col =>
        {
            col.Item().Text(heading.ToUpperInvariant()).FontSize(7).Bold().FontColor(GreyText).LetterSpacing(1);
            col.Item().PaddingTop(2).Text(main).FontSize(10).Bold().FontColor(BrandNavy);
            if (!string.IsNullOrWhiteSpace(sub))
                col.Item().PaddingTop(2).Text(sub).FontSize(8).FontColor("#495057");
        });
    }

    private static void ItemsTable(QuestPDF.Infrastructure.IContainer c, QuotePdfInput q)
    {
        c.Table(t =>
        {
            t.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(20);
                cols.RelativeColumn(5);
                cols.ConstantColumn(40);
                cols.ConstantColumn(70);
                cols.ConstantColumn(60);
                cols.ConstantColumn(70);
            });
            t.Header(h =>
            {
                h.Cell().Background(BrandNavy).Padding(6).Text("#").FontSize(8).Bold().FontColor(Colors.White);
                h.Cell().Background(BrandNavy).Padding(6).Text("รายการ").FontSize(8).Bold().FontColor(Colors.White);
                h.Cell().Background(BrandNavy).Padding(6).AlignRight().Text("จำนวน").FontSize(8).Bold().FontColor(Colors.White);
                h.Cell().Background(BrandNavy).Padding(6).AlignRight().Text("ราคา/หน่วย").FontSize(8).Bold().FontColor(Colors.White);
                h.Cell().Background(BrandNavy).Padding(6).AlignRight().Text("ส่วนลด").FontSize(8).Bold().FontColor(Colors.White);
                h.Cell().Background(BrandNavy).Padding(6).AlignRight().Text("รวม").FontSize(8).Bold().FontColor(Colors.White);
            });
            for (var i = 0; i < q.Items.Count; i++)
            {
                var it = q.Items[i];
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).AlignRight().Text((i + 1).ToString(CultureInfo.InvariantCulture)).FontSize(9);
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).Column(c =>
                {
                    c.Item().Text(it.Name).FontSize(9).SemiBold();
                    c.Item().Text(it.Sku).FontSize(7).FontFamily(Fonts.CourierNew).FontColor(GreyText);
                });
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).AlignRight().Text(it.Qty.ToString(Th)).FontSize(9);
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).AlignRight().Text(Money(it.UnitPrice)).FontSize(9);
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).AlignRight().Text(it.Discount > 0 ? "−" + Money(it.Discount) : "–").FontSize(9);
                t.Cell().BorderBottom(1).BorderColor(GreyBorder).Padding(8).AlignRight().Text(Money(it.LineTotal)).FontSize(9).Bold().FontColor(BrandNavy);
            }
        });
    }

    private static void Totals(QuestPDF.Infrastructure.IContainer c, QuotePdfInput q)
    {
        c.PaddingTop(10).AlignRight().Width(220).Column(col =>
        {
            Row(col, "ยอดรวมก่อนส่วนลด", "฿" + Money(q.Subtotal), false);
            if (q.Discount > 0) Row(col, "ส่วนลดเพิ่มเติม", "−฿" + Money(q.Discount), false);
            Row(col, $"VAT {q.VatRate.ToString(CultureInfo.InvariantCulture)}%", "฿" + Money(q.Vat), false);
            col.Item().PaddingTop(4).BorderTop(2).BorderColor(BrandNavy).PaddingTop(4)
                .Row(r =>
                {
                    r.RelativeItem().Text("ยอดสุทธิ").FontSize(11).Bold().FontColor(BrandNavy);
                    r.AutoItem().Text("฿" + Money(q.Total)).FontSize(13).Bold().FontColor(BrandRed);
                });
        });

        static void Row(QuestPDF.Fluent.ColumnDescriptor col, string label, string value, bool bold)
        {
            col.Item().PaddingVertical(2).Row(r =>
            {
                r.RelativeItem().Text(label).FontSize(9).FontColor("#495057");
                r.AutoItem().Text(value).FontSize(9);
            });
        }
    }

    private static void Terms(QuestPDF.Infrastructure.IContainer c, QuotePdfInput q)
    {
        var days = (int)Math.Ceiling((q.ValidUntil - q.CreatedAt).TotalDays);
        c.Background("#FFF6CC").BorderLeft(3).BorderColor("#FFCE00").Padding(10).Text(t =>
        {
            t.Span("เงื่อนไข: ").Bold().FontColor(BrandNavy);
            t.Span($"ใบเสนอราคานี้มีอายุ {days} วัน นับจากวันที่ออก • ราคารวม VAT {q.VatRate.ToString(CultureInfo.InvariantCulture)}% • ยืนยันคำสั่งซื้อกับทีมขายก่อนการชำระเงินล่วงหน้า")
                .FontSize(8).FontColor("#495057");
        });
    }

    private static void Footer(QuestPDF.Infrastructure.IContainer f) =>
        f.BorderTop(1).BorderColor(GreyBorder).PaddingTop(6).Row(r =>
        {
            r.RelativeItem().Text("NBA Sport Thailand • nbasport.co.th").FontSize(7).FontColor(GreyText);
            r.RelativeItem().AlignRight().Text($"เอกสารนี้สร้างจากระบบ OMS เมื่อ {Date(DateTime.UtcNow)}").FontSize(7).FontColor(GreyText);
        });

    private static string Money(decimal n) => n.ToString("N2", Th);
    private static string Date(DateTime d) => d.ToString("dd MMM yyyy", Th);

    private static string BuildCustomerSub(QuotePdfCustomer c)
    {
        var lines = new List<string>();
        if (!string.IsNullOrWhiteSpace(c.TaxId)) lines.Add($"เลขผู้เสียภาษี: {c.TaxId}");
        if (!string.IsNullOrWhiteSpace(c.Address)) lines.Add(c.Address);
        var contact = string.Join(" • ", new[] { c.ContactName, c.Phone }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrEmpty(contact)) lines.Add($"ติดต่อ: {contact}");
        return string.Join("\n", lines);
    }
}
