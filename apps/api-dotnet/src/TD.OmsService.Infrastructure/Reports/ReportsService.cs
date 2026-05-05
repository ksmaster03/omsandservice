using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Reports;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Reports;

/// <summary>
/// Aggregation queries for the admin dashboard. EF Core's GroupBy translation
/// covers the simple counts here — heavier reports (multi-table joins,
/// month-over-month trends) should drop to Dapper or stored procs for perf.
/// </summary>
public sealed class ReportsService(AppDbContext db) : IReportsService
{
    public async Task<DashboardSummaryDto> DashboardAsync(CancellationToken ct)
    {
        var monthAgo = DateTime.UtcNow.AddDays(-30);
        var now = DateTime.UtcNow;

        var customerCount = await db.Customers.CountAsync(c => c.Active, ct);
        var assetCount = await db.Assets.CountAsync(ct);
        var openTickets = await db.ServiceTickets.CountAsync(t => t.Stage != TicketStage.CLOSED && t.Stage != TicketStage.CANCELLED, ct);
        var overduePm = await db.PmSchedules.CountAsync(p => p.Status == PmStatus.OVERDUE || (p.Status == PmStatus.PENDING && p.ScheduledAt < now), ct);
        var pendingRma = await db.Rmas.CountAsync(r => r.Stage != RmaStage.CANCELLED && r.Stage != RmaStage.REFUNDED && r.Stage != RmaStage.REPLACED && r.Stage != RmaStage.REFURBISHED, ct);
        var revenue = await db.SalesOrders
            .Where(so => so.CreatedAt >= monthAgo && (so.Status == SOStatus.COMPLETED || so.Status == SOStatus.INSTALLED))
            .SumAsync(so => (decimal?)so.Total, ct) ?? 0m;

        return new DashboardSummaryDto(customerCount, assetCount, openTickets, overduePm, pendingRma, revenue);
    }

    public async Task<IReadOnlyList<SalesPipelineCountDto>> SalesPipelineAsync(CancellationToken ct)
    {
        return await db.Leads
            .GroupBy(l => l.Stage)
            .Select(g => new SalesPipelineCountDto(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProductTopSellerDto>> TopSellersAsync(int limit, CancellationToken ct)
    {
        limit = Math.Clamp(limit, 1, 50);
        return await db.Soitems
            .GroupBy(i => new { i.ProductId, i.Product.Name })
            .Select(g => new ProductTopSellerDto(
                g.Key.ProductId,
                g.Key.Name,
                g.Sum(x => x.Qty),
                g.Sum(x => x.Qty * x.UnitPrice)))
            .OrderByDescending(x => x.UnitsSold)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TicketsByStageDto>> TicketsByStageAsync(CancellationToken ct)
    {
        return await db.ServiceTickets
            .GroupBy(t => t.Stage)
            .Select(g => new TicketsByStageDto(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);
    }
}
