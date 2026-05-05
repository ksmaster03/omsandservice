using Microsoft.EntityFrameworkCore;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Persistence;

/// <summary>
/// Wires the partial-class enum properties (added in EntityEnumExtensions.cs)
/// to their actual Postgres columns. We override OnModelCreating via the
/// scaffolded `partial class AppDbContext` so re-running the scaffold doesn't
/// clobber these mappings.
/// </summary>
public partial class AppDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        // ── Master data ─────────────────────────────────────
        modelBuilder.Entity<Customer>().Property(e => e.Type).HasColumnName("type").HasColumnType("\"CustomerType\"");
        modelBuilder.Entity<User>().Property(e => e.Role).HasColumnName("role").HasColumnType("\"UserRole\"");
        modelBuilder.Entity<Product>().Property(e => e.Brand).HasColumnName("brand").HasColumnType("\"Brand\"");

        // ── Sales flow ──────────────────────────────────────
        modelBuilder.Entity<Lead>().Property(e => e.Stage).HasColumnName("stage").HasColumnType("\"LeadStage\"");
        modelBuilder.Entity<Quotation>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"QuoteStatus\"");
        modelBuilder.Entity<SalesOrder>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"SOStatus\"");
        modelBuilder.Entity<PaymentMilestone>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"MilestoneStatus\"");
        modelBuilder.Entity<Demo>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"DemoStatus\"");

        // ── After-sales ─────────────────────────────────────
        modelBuilder.Entity<Installation>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"InstallStatus\"");
        modelBuilder.Entity<PmSchedule>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"PmStatus\"");
        modelBuilder.Entity<WarrantyRenewal>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"RenewalStatus\"");
        modelBuilder.Entity<ServiceTicket>().Property(e => e.ProblemType).HasColumnName("problemType").HasColumnType("\"ProblemType\"");
        modelBuilder.Entity<ServiceTicket>().Property(e => e.Priority).HasColumnName("priority").HasColumnType("\"Priority\"");
        modelBuilder.Entity<ServiceTicket>().Property(e => e.Stage).HasColumnName("stage").HasColumnType("\"TicketStage\"");
        modelBuilder.Entity<TicketEvent>().Property(e => e.Stage).HasColumnName("stage").HasColumnType("\"TicketStage\"");

        // ── RMA / Stock / WMS ───────────────────────────────
        modelBuilder.Entity<Rma>().Property(e => e.Reason).HasColumnName("reason").HasColumnType("\"RmaReason\"");
        modelBuilder.Entity<Rma>().Property(e => e.Stage).HasColumnName("stage").HasColumnType("\"RmaStage\"");
        modelBuilder.Entity<Rma>().Property(e => e.Resolution).HasColumnName("resolution").HasColumnType("\"RmaResolution\"");
        modelBuilder.Entity<RmaEvent>().Property(e => e.Stage).HasColumnName("stage").HasColumnType("\"RmaStage\"");
        modelBuilder.Entity<StockReservation>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"StockReservationStatus\"");
        modelBuilder.Entity<WmsSyncLog>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"SyncStatus\"");
        modelBuilder.Entity<LineMessage>().Property(e => e.Direction).HasColumnName("direction").HasColumnType("\"MsgDir\"");

        // ── Feedback / Agreements ───────────────────────────
        modelBuilder.Entity<Feedback>().Property(e => e.Type).HasColumnName("type").HasColumnType("\"FeedbackType\"");
        modelBuilder.Entity<Feedback>().Property(e => e.Priority).HasColumnName("priority").HasColumnType("\"FeedbackPriority\"");
        modelBuilder.Entity<Feedback>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"FeedbackStatus\"");
        modelBuilder.Entity<ServiceAgreement>().Property(e => e.Status).HasColumnName("status").HasColumnType("\"ServiceAgreementStatus\"");
    }
}
