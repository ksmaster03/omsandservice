using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.CustomerPortal;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.CustomerPortal;

/// <summary>
/// Customer-scoped data access. Every query is filtered by `customerId` from
/// the authenticated CustomerUser claim, so a customer can never see another
/// account's records.
/// </summary>
public sealed class CustomerPortalService(AppDbContext db) : ICustomerPortalService
{
    public async Task<MyProfileSummary?> MeAsync(string customerUserId, CancellationToken ct)
    {
        var cu = await db.CustomerUsers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == customerUserId, ct);
        return cu is null
            ? null
            : new MyProfileSummary(cu.Id, cu.CustomerId, cu.Phone ?? string.Empty, cu.DisplayName, cu.Email);
    }

    public async Task<IReadOnlyList<MyAssetItem>> MyAssetsAsync(string customerId, CancellationToken ct)
    {
        return await db.Assets.AsNoTracking()
            .Where(a => a.CustomerId == customerId)
            .Include(a => a.Product)
            .OrderByDescending(a => a.InstalledAt)
            .Select(a => new MyAssetItem(a.Id, a.SerialNo, a.Product.Name, a.InstalledAt, a.WarrantyEnd, a.NextPmDate))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<MyTicketItem>> MyTicketsAsync(string customerId, CancellationToken ct)
    {
        return await db.ServiceTickets.AsNoTracking()
            .Where(t => t.CustomerId == customerId)
            .Include(t => t.Asset)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new MyTicketItem(t.Id, t.TicketNo, t.Asset.SerialNo, t.ProblemType, t.Priority, t.Stage, t.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<MyRenewalItem>> MyRenewalsAsync(string customerId, CancellationToken ct)
    {
        return await db.WarrantyRenewals.AsNoTracking()
            .Where(r => r.Asset.CustomerId == customerId)
            .Include(r => r.Asset)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new MyRenewalItem(r.Id, r.Asset.SerialNo, r.Status, r.Price, r.NewEndDate))
            .ToListAsync(ct);
    }

    public async Task<MyTicketItem> CreateMyTicketAsync(string customerId, CreateMyTicketRequest req, CancellationToken ct)
    {
        // Verify the asset belongs to this customer (defense-in-depth even if the FE constrains it)
        var asset = await db.Assets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == req.AssetId && a.CustomerId == customerId, ct)
            ?? throw new KeyNotFoundException($"Asset {req.AssetId} not found for customer");

        // SLA hours match Node behavior: URGENT 4h, NORMAL 24h, LOW 72h
        var slaHours = req.Priority switch { Priority.URGENT => 4, Priority.NORMAL => 24, Priority.LOW => 72, _ => 24 };
        var ticketNo = $"TK-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        var ticket = new ServiceTicket
        {
            Id = Guid.NewGuid().ToString(),
            TicketNo = ticketNo,
            CustomerId = customerId,
            AssetId = req.AssetId,
            ProblemType = req.ProblemType,
            Priority = req.Priority,
            Description = req.Description,
            LocationDetail = req.LocationDetail,
            Stage = TicketStage.RECEIVED,
            SlaDueAt = DateTime.UtcNow.AddHours(slaHours),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.ServiceTickets.Add(ticket);
        db.TicketEvents.Add(new TicketEvent
        {
            Id = Guid.NewGuid().ToString(),
            TicketId = ticket.Id,
            Stage = TicketStage.RECEIVED,
            Note = "แจ้งซ่อมผ่าน Customer PWA",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return new MyTicketItem(ticket.Id, ticket.TicketNo, asset.SerialNo, ticket.ProblemType, ticket.Priority, ticket.Stage, ticket.CreatedAt);
    }
}
