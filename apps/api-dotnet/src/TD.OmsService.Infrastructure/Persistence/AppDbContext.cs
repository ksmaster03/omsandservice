using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using TD.OmsService.Infrastructure.Persistence.Generated;

namespace TD.OmsService.Infrastructure.Persistence;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Asset> Assets { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<CustomerUser> CustomerUsers { get; set; }

    public virtual DbSet<Demo> Demos { get; set; }

    public virtual DbSet<Feedback> Feedbacks { get; set; }

    public virtual DbSet<FeedbackReply> FeedbackReplies { get; set; }

    public virtual DbSet<InstallChecklist> InstallChecklists { get; set; }

    public virtual DbSet<Installation> Installations { get; set; }

    public virtual DbSet<Lead> Leads { get; set; }

    public virtual DbSet<LineMessage> LineMessages { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<PaymentMilestone> PaymentMilestones { get; set; }

    public virtual DbSet<PmSchedule> PmSchedules { get; set; }

    public virtual DbSet<PrismaMigration> PrismaMigrations { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Quotation> Quotations { get; set; }

    public virtual DbSet<QuotationItem> QuotationItems { get; set; }

    public virtual DbSet<Rma> Rmas { get; set; }

    public virtual DbSet<RmaEvent> RmaEvents { get; set; }

    public virtual DbSet<SalesOrder> SalesOrders { get; set; }

    public virtual DbSet<ServiceAgreement> ServiceAgreements { get; set; }

    public virtual DbSet<ServiceTicket> ServiceTickets { get; set; }

    public virtual DbSet<Setting> Settings { get; set; }

    public virtual DbSet<Soitem> Soitems { get; set; }

    public virtual DbSet<SparePart> SpareParts { get; set; }

    public virtual DbSet<SparePartUsage> SparePartUsages { get; set; }

    public virtual DbSet<StockItem> StockItems { get; set; }

    public virtual DbSet<StockReservation> StockReservations { get; set; }

    public virtual DbSet<TechLocation> TechLocations { get; set; }

    public virtual DbSet<TicketEvent> TicketEvents { get; set; }

    public virtual DbSet<TicketPhoto> TicketPhotos { get; set; }

    public virtual DbSet<TicketVideo> TicketVideos { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<WarrantyRenewal> WarrantyRenewals { get; set; }

    public virtual DbSet<WmsStockCache> WmsStockCaches { get; set; }

    public virtual DbSet<WmsSyncLog> WmsSyncLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("Brand", new[] { "MAXNUM", "GORILLA_TECK", "ANYFIT", "IMPULSE" })
            .HasPostgresEnum("CustomerType", new[] { "INDIVIDUAL", "CORPORATE" })
            .HasPostgresEnum("DemoStatus", new[] { "SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW" })
            .HasPostgresEnum("FeedbackPriority", new[] { "LOW", "MEDIUM", "HIGH", "CRITICAL" })
            .HasPostgresEnum("FeedbackStatus", new[] { "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "WONT_FIX" })
            .HasPostgresEnum("FeedbackType", new[] { "BUG", "FEATURE", "IMPROVEMENT", "QUESTION", "OTHER" })
            .HasPostgresEnum("InstallStatus", new[] { "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED" })
            .HasPostgresEnum("LeadStage", new[] { "LEAD", "QUALIFIED", "DEMO", "QUOTE", "NEGOTIATION", "WON", "LOST" })
            .HasPostgresEnum("MilestoneStatus", new[] { "PENDING", "DUE", "PAID", "OVERDUE" })
            .HasPostgresEnum("MsgDir", new[] { "IN", "OUT" })
            .HasPostgresEnum("PmStatus", new[] { "PENDING", "SCHEDULED", "COMPLETED", "OVERDUE", "SKIPPED" })
            .HasPostgresEnum("Priority", new[] { "URGENT", "NORMAL", "LOW" })
            .HasPostgresEnum("ProblemType", new[] { "BELT", "NOISE", "CONSOLE", "MOTOR", "POWER", "OTHER", "PM" })
            .HasPostgresEnum("QuoteStatus", new[] { "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED" })
            .HasPostgresEnum("RenewalStatus", new[] { "OFFERED", "ACCEPTED", "PAID", "EXPIRED" })
            .HasPostgresEnum("RmaReason", new[] { "DOA", "DEFECT", "WRONG_ITEM", "CUSTOMER_CHANGE_MIND", "WARRANTY_CLAIM", "OTHER" })
            .HasPostgresEnum("RmaResolution", new[] { "REFUND", "REPLACE", "REFURBISH", "REJECTED" })
            .HasPostgresEnum("RmaStage", new[] { "REQUESTED", "APPROVED", "REJECTED", "PICKUP_SCHEDULED", "PICKED_UP", "INSPECTING", "REFUNDED", "REPLACED", "REFURBISHED", "CANCELLED" })
            .HasPostgresEnum("SOStatus", new[] { "PENDING", "CONFIRMED", "IN_PRODUCTION", "READY_TO_DELIVER", "INSTALLED", "COMPLETED", "CANCELLED" })
            .HasPostgresEnum("ServiceAgreementStatus", new[] { "DRAFT", "ACTIVE", "EXPIRED", "CANCELLED" })
            .HasPostgresEnum("StockReservationStatus", new[] { "ACTIVE", "RELEASED", "CONSUMED" })
            .HasPostgresEnum("SyncStatus", new[] { "PENDING", "SUCCESS", "FAILED", "RETRY" })
            .HasPostgresEnum("TicketStage", new[] { "RECEIVED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "REPAIRING", "CLOSED", "CANCELLED" })
            .HasPostgresEnum("UserRole", new[] { "SALES", "INSTALL", "SERVICE", "ADMIN" });

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Asset_pkey");

            entity.ToTable("Asset");

            entity.HasIndex(e => e.SerialNo, "Asset_serialNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.InstalledAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("installedAt");
            entity.Property(e => e.LocationDetail).HasColumnName("locationDetail");
            entity.Property(e => e.NextPmDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("nextPmDate");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.SerialNo).HasColumnName("serialNo");
            entity.Property(e => e.SoId).HasColumnName("soId");
            entity.Property(e => e.WarrantyEnd)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("warrantyEnd");

            entity.HasOne(d => d.Customer).WithMany(p => p.Assets)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Asset_customerId_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.Assets)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Asset_productId_fkey");

            entity.HasOne(d => d.So).WithMany(p => p.Assets)
                .HasForeignKey(d => d.SoId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Asset_soId_fkey");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("AuditLog_pkey");

            entity.ToTable("AuditLog");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action).HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Diff)
                .HasColumnType("jsonb")
                .HasColumnName("diff");
            entity.Property(e => e.Entity).HasColumnName("entity");
            entity.Property(e => e.EntityId).HasColumnName("entityId");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("AuditLog_userId_fkey");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Customer_pkey");

            entity.ToTable("Customer");

            entity.HasIndex(e => e.WmsCode, "Customer_wmsCode_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.AlternateAddress).HasColumnName("alternateAddress");
            entity.Property(e => e.AlternateName).HasColumnName("alternateName");
            entity.Property(e => e.ContactName).HasColumnName("contactName");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomData)
                .HasDefaultValueSql("'{}'::jsonb")
                .HasColumnType("jsonb")
                .HasColumnName("customData");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Lat)
                .HasPrecision(10, 7)
                .HasColumnName("lat");
            entity.Property(e => e.Lng)
                .HasPrecision(10, 7)
                .HasColumnName("lng");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.TaxId).HasColumnName("taxId");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.WmsCode).HasColumnName("wmsCode");
        });

        modelBuilder.Entity<CustomerUser>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("CustomerUser_pkey");

            entity.ToTable("CustomerUser");

            entity.HasIndex(e => e.LineUserId, "CustomerUser_lineUserId_key").IsUnique();

            entity.HasIndex(e => e.Phone, "CustomerUser_phone_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatarUrl");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.DisplayName).HasColumnName("displayName");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.LastLoginAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("lastLoginAt");
            entity.Property(e => e.LineUserId).HasColumnName("lineUserId");
            entity.Property(e => e.Phone).HasColumnName("phone");

            entity.HasOne(d => d.Customer).WithMany(p => p.CustomerUsers)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("CustomerUser_customerId_fkey");
        });

        modelBuilder.Entity<Demo>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Demo_pkey");

            entity.ToTable("Demo");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.ContactName).HasColumnName("contactName");
            entity.Property(e => e.ContactPhone).HasColumnName("contactPhone");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.LeadId).HasColumnName("leadId");
            entity.Property(e => e.Location).HasColumnName("location");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.ScheduledAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("scheduledAt");

            entity.HasOne(d => d.Lead).WithMany(p => p.Demos)
                .HasForeignKey(d => d.LeadId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Demo_leadId_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.Demos)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Demo_productId_fkey");
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Feedback_pkey");

            entity.ToTable("Feedback");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssignedTo).HasColumnName("assignedTo");
            entity.Property(e => e.Attachments)
                .HasColumnType("jsonb")
                .HasColumnName("attachments");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Resolution).HasColumnName("resolution");
            entity.Property(e => e.ResolvedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("resolvedAt");
            entity.Property(e => e.Screenshot).HasColumnName("screenshot");
            entity.Property(e => e.Source)
                .HasDefaultValueSql("'admin'::text")
                .HasColumnName("source");
            entity.Property(e => e.Subject).HasColumnName("subject");
            entity.Property(e => e.SubmittedBy).HasColumnName("submittedBy");
            entity.Property(e => e.SubmitterEmail).HasColumnName("submitterEmail");
            entity.Property(e => e.SubmitterName).HasColumnName("submitterName");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
        });

        modelBuilder.Entity<FeedbackReply>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("FeedbackReply_pkey");

            entity.ToTable("FeedbackReply");

            entity.HasIndex(e => e.FeedbackId, "FeedbackReply_feedbackId_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AuthorName).HasColumnName("authorName");
            entity.Property(e => e.AuthorRole).HasColumnName("authorRole");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.FeedbackId).HasColumnName("feedbackId");
            entity.Property(e => e.IsInternal)
                .HasDefaultValue(false)
                .HasColumnName("isInternal");
            entity.Property(e => e.Message).HasColumnName("message");

            entity.HasOne(d => d.Feedback).WithMany(p => p.FeedbackReplies)
                .HasForeignKey(d => d.FeedbackId)
                .HasConstraintName("FeedbackReply_feedbackId_fkey");
        });

        modelBuilder.Entity<InstallChecklist>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("InstallChecklist_pkey");

            entity.ToTable("InstallChecklist");

            entity.HasIndex(e => e.InstallationId, "InstallChecklist_installationId_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Checked)
                .HasDefaultValue(false)
                .HasColumnName("checked");
            entity.Property(e => e.CheckedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("checkedAt");
            entity.Property(e => e.CheckedBy).HasColumnName("checkedBy");
            entity.Property(e => e.InstallationId).HasColumnName("installationId");
            entity.Property(e => e.Label).HasColumnName("label");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.PhotoKey).HasColumnName("photoKey");
            entity.Property(e => e.Step).HasColumnName("step");
        });

        modelBuilder.Entity<Installation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Installation_pkey");

            entity.ToTable("Installation");

            entity.HasIndex(e => e.BusinessKey, "Installation_businessKey_key").IsUnique();

            entity.HasIndex(e => e.SoId, "Installation_soId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BusinessKey).HasColumnName("businessKey");
            entity.Property(e => e.CompletedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("completedAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Photos)
                .HasDefaultValueSql("ARRAY[]::text[]")
                .HasColumnName("photos");
            entity.Property(e => e.ScheduledAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("scheduledAt");
            entity.Property(e => e.SoId).HasColumnName("soId");
            entity.Property(e => e.TechId).HasColumnName("techId");

            entity.HasOne(d => d.So).WithOne(p => p.Installation)
                .HasForeignKey<Installation>(d => d.SoId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Installation_soId_fkey");

            entity.HasOne(d => d.Tech).WithMany(p => p.Installations)
                .HasForeignKey(d => d.TechId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("Installation_techId_fkey");
        });

        modelBuilder.Entity<Lead>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Lead_pkey");

            entity.ToTable("Lead");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.ExpectedClose)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("expectedClose");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.OwnerId).HasColumnName("ownerId");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.Value)
                .HasPrecision(12, 2)
                .HasColumnName("value");

            entity.HasOne(d => d.Customer).WithMany(p => p.Leads)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Lead_customerId_fkey");

            entity.HasOne(d => d.Owner).WithMany(p => p.Leads)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Lead_ownerId_fkey");
        });

        modelBuilder.Entity<LineMessage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("LineMessage_pkey");

            entity.ToTable("LineMessage");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerUserId).HasColumnName("customerUserId");
            entity.Property(e => e.ImageS3key).HasColumnName("imageS3Key");
            entity.Property(e => e.LineMessageId).HasColumnName("lineMessageId");
            entity.Property(e => e.Text).HasColumnName("text");
            entity.Property(e => e.TicketId).HasColumnName("ticketId");

            entity.HasOne(d => d.CustomerUser).WithMany(p => p.LineMessages)
                .HasForeignKey(d => d.CustomerUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("LineMessage_customerUserId_fkey");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Notification_pkey");

            entity.ToTable("Notification");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Body).HasColumnName("body");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerUserId).HasColumnName("customerUserId");
            entity.Property(e => e.Link).HasColumnName("link");
            entity.Property(e => e.ReadAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("readAt");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.CustomerUser).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.CustomerUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("Notification_customerUserId_fkey");
        });

        modelBuilder.Entity<PaymentMilestone>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PaymentMilestone_pkey");

            entity.ToTable("PaymentMilestone");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount)
                .HasPrecision(12, 2)
                .HasColumnName("amount");
            entity.Property(e => e.DueDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("dueDate");
            entity.Property(e => e.Label).HasColumnName("label");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("paidAt");
            entity.Property(e => e.Seq).HasColumnName("seq");
            entity.Property(e => e.SoId).HasColumnName("soId");

            entity.HasOne(d => d.So).WithMany(p => p.PaymentMilestones)
                .HasForeignKey(d => d.SoId)
                .HasConstraintName("PaymentMilestone_soId_fkey");
        });

        modelBuilder.Entity<PmSchedule>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PmSchedule_pkey");

            entity.ToTable("PmSchedule");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("assetId");
            entity.Property(e => e.CompletedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("completedAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.ScheduledAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("scheduledAt");
            entity.Property(e => e.TechId).HasColumnName("techId");

            entity.HasOne(d => d.Asset).WithMany(p => p.PmSchedules)
                .HasForeignKey(d => d.AssetId)
                .HasConstraintName("PmSchedule_assetId_fkey");

            entity.HasOne(d => d.Tech).WithMany(p => p.PmSchedules)
                .HasForeignKey(d => d.TechId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("PmSchedule_techId_fkey");
        });

        modelBuilder.Entity<PrismaMigration>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("_prisma_migrations_pkey");

            entity.ToTable("_prisma_migrations");

            entity.Property(e => e.Id)
                .HasMaxLength(36)
                .HasColumnName("id");
            entity.Property(e => e.AppliedStepsCount)
                .HasDefaultValue(0)
                .HasColumnName("applied_steps_count");
            entity.Property(e => e.Checksum)
                .HasMaxLength(64)
                .HasColumnName("checksum");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.Logs).HasColumnName("logs");
            entity.Property(e => e.MigrationName)
                .HasMaxLength(255)
                .HasColumnName("migration_name");
            entity.Property(e => e.RolledBackAt).HasColumnName("rolled_back_at");
            entity.Property(e => e.StartedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("started_at");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Product_pkey");

            entity.ToTable("Product");

            entity.HasIndex(e => e.Sku, "Product_sku_key").IsUnique();

            entity.HasIndex(e => e.WmsPartNo, "Product_wmsPartNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.PartType).HasColumnName("partType");
            entity.Property(e => e.PmIntervalMonths)
                .HasDefaultValue(3)
                .HasColumnName("pmIntervalMonths");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.StandardPack).HasColumnName("standardPack");
            entity.Property(e => e.Uom)
                .HasDefaultValueSql("'EA'::text")
                .HasColumnName("uom");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.WarrantyMonths)
                .HasDefaultValue(24)
                .HasColumnName("warrantyMonths");
            entity.Property(e => e.WmsPartNo).HasColumnName("wmsPartNo");
        });

        modelBuilder.Entity<Quotation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Quotation_pkey");

            entity.ToTable("Quotation");

            entity.HasIndex(e => e.QuoteNo, "Quotation_quoteNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.Discount)
                .HasPrecision(12, 2)
                .HasColumnName("discount");
            entity.Property(e => e.LeadId).HasColumnName("leadId");
            entity.Property(e => e.PdfS3key).HasColumnName("pdfS3Key");
            entity.Property(e => e.QuoteNo).HasColumnName("quoteNo");
            entity.Property(e => e.SalesId).HasColumnName("salesId");
            entity.Property(e => e.Subtotal)
                .HasPrecision(12, 2)
                .HasColumnName("subtotal");
            entity.Property(e => e.Total)
                .HasPrecision(12, 2)
                .HasColumnName("total");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.ValidUntil)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("validUntil");
            entity.Property(e => e.Vat)
                .HasPrecision(12, 2)
                .HasColumnName("vat");

            entity.HasOne(d => d.Customer).WithMany(p => p.Quotations)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Quotation_customerId_fkey");

            entity.HasOne(d => d.Lead).WithMany(p => p.Quotations)
                .HasForeignKey(d => d.LeadId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("Quotation_leadId_fkey");

            entity.HasOne(d => d.Sales).WithMany(p => p.Quotations)
                .HasForeignKey(d => d.SalesId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Quotation_salesId_fkey");
        });

        modelBuilder.Entity<QuotationItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("QuotationItem_pkey");

            entity.ToTable("QuotationItem");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Discount)
                .HasPrecision(12, 2)
                .HasColumnName("discount");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.Qty).HasColumnName("qty");
            entity.Property(e => e.QuotationId).HasColumnName("quotationId");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(12, 2)
                .HasColumnName("unitPrice");

            entity.HasOne(d => d.Product).WithMany(p => p.QuotationItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("QuotationItem_productId_fkey");

            entity.HasOne(d => d.Quotation).WithMany(p => p.QuotationItems)
                .HasForeignKey(d => d.QuotationId)
                .HasConstraintName("QuotationItem_quotationId_fkey");
        });

        modelBuilder.Entity<Rma>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("Rma_pkey");

            entity.ToTable("Rma");

            entity.HasIndex(e => e.AssetId, "Rma_assetId_idx");

            entity.HasIndex(e => e.BusinessKey, "Rma_businessKey_key").IsUnique();

            entity.HasIndex(e => e.CustomerId, "Rma_customerId_idx");

            entity.HasIndex(e => e.RmaNo, "Rma_rmaNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("assetId");
            entity.Property(e => e.BusinessKey).HasColumnName("businessKey");
            entity.Property(e => e.ClosedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("closedAt");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CreatedById).HasColumnName("createdById");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.InspectedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("inspectedAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.PickedUpAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("pickedUpAt");
            entity.Property(e => e.PickupAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("pickupAt");
            entity.Property(e => e.RefundAmount)
                .HasPrecision(12, 2)
                .HasColumnName("refundAmount");
            entity.Property(e => e.ReplacementAssetId).HasColumnName("replacementAssetId");
            entity.Property(e => e.RmaNo).HasColumnName("rmaNo");
            entity.Property(e => e.SoId).HasColumnName("soId");
            entity.Property(e => e.TechId).HasColumnName("techId");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.Asset).WithMany(p => p.Rmas)
                .HasForeignKey(d => d.AssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Rma_assetId_fkey");

            entity.HasOne(d => d.Customer).WithMany(p => p.Rmas)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("Rma_customerId_fkey");

            entity.HasOne(d => d.Tech).WithMany(p => p.Rmas)
                .HasForeignKey(d => d.TechId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("Rma_techId_fkey");
        });

        modelBuilder.Entity<RmaEvent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("RmaEvent_pkey");

            entity.ToTable("RmaEvent");

            entity.HasIndex(e => e.RmaId, "RmaEvent_rmaId_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActorId).HasColumnName("actorId");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.RmaId).HasColumnName("rmaId");

            entity.HasOne(d => d.Rma).WithMany(p => p.RmaEvents)
                .HasForeignKey(d => d.RmaId)
                .HasConstraintName("RmaEvent_rmaId_fkey");
        });

        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("SalesOrder_pkey");

            entity.ToTable("SalesOrder");

            entity.HasIndex(e => e.BusinessKey, "SalesOrder_businessKey_key").IsUnique();

            entity.HasIndex(e => e.QuotationId, "SalesOrder_quotationId_key").IsUnique();

            entity.HasIndex(e => e.SoNo, "SalesOrder_soNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BusinessKey).HasColumnName("businessKey");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.QuotationId).HasColumnName("quotationId");
            entity.Property(e => e.SoNo).HasColumnName("soNo");
            entity.Property(e => e.Total)
                .HasPrecision(12, 2)
                .HasColumnName("total");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.WmsOrderId).HasColumnName("wmsOrderId");

            entity.HasOne(d => d.Customer).WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("SalesOrder_customerId_fkey");

            entity.HasOne(d => d.Quotation).WithOne(p => p.SalesOrder)
                .HasForeignKey<SalesOrder>(d => d.QuotationId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("SalesOrder_quotationId_fkey");
        });

        modelBuilder.Entity<ServiceAgreement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ServiceAgreement_pkey");

            entity.ToTable("ServiceAgreement");

            entity.HasIndex(e => e.AgreementNo, "ServiceAgreement_agreementNo_key").IsUnique();

            entity.HasIndex(e => e.CustomerId, "ServiceAgreement_customerId_idx");

            entity.HasIndex(e => e.EndDate, "ServiceAgreement_endDate_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AgreementNo).HasColumnName("agreementNo");
            entity.Property(e => e.AutoRenew)
                .HasDefaultValue(false)
                .HasColumnName("autoRenew");
            entity.Property(e => e.Coverage).HasColumnName("coverage");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.EndDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("endDate");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.StartDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("startDate");
            entity.Property(e => e.Type)
                .HasDefaultValueSql("'PM_PACKAGE'::text")
                .HasColumnName("type");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.Customer).WithMany(p => p.ServiceAgreements)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("ServiceAgreement_customerId_fkey");
        });

        modelBuilder.Entity<ServiceTicket>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ServiceTicket_pkey");

            entity.ToTable("ServiceTicket");

            entity.HasIndex(e => e.BusinessKey, "ServiceTicket_businessKey_key").IsUnique();

            entity.HasIndex(e => e.TicketNo, "ServiceTicket_ticketNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("assetId");
            entity.Property(e => e.AssignedTechId).HasColumnName("assignedTechId");
            entity.Property(e => e.BusinessKey).HasColumnName("businessKey");
            entity.Property(e => e.ClosedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("closedAt");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.CustomerRating).HasColumnName("customerRating");
            entity.Property(e => e.CustomerReview).HasColumnName("customerReview");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.LocationAddress).HasColumnName("locationAddress");
            entity.Property(e => e.LocationDetail).HasColumnName("locationDetail");
            entity.Property(e => e.LocationLat)
                .HasPrecision(10, 7)
                .HasColumnName("locationLat");
            entity.Property(e => e.LocationLng)
                .HasPrecision(10, 7)
                .HasColumnName("locationLng");
            entity.Property(e => e.SlaDueAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("slaDueAt");
            entity.Property(e => e.TicketNo).HasColumnName("ticketNo");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.Asset).WithMany(p => p.ServiceTickets)
                .HasForeignKey(d => d.AssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("ServiceTicket_assetId_fkey");

            entity.HasOne(d => d.AssignedTech).WithMany(p => p.ServiceTickets)
                .HasForeignKey(d => d.AssignedTechId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("ServiceTicket_assignedTechId_fkey");

            entity.HasOne(d => d.Customer).WithMany(p => p.ServiceTickets)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("ServiceTicket_customerId_fkey");
        });

        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.Key).HasName("Setting_pkey");

            entity.ToTable("Setting");

            entity.Property(e => e.Key).HasColumnName("key");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.UpdatedBy).HasColumnName("updatedBy");
            entity.Property(e => e.Value).HasColumnName("value");
        });

        modelBuilder.Entity<Soitem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("SOItem_pkey");

            entity.ToTable("SOItem");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.Qty).HasColumnName("qty");
            entity.Property(e => e.SoId).HasColumnName("soId");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(12, 2)
                .HasColumnName("unitPrice");

            entity.HasOne(d => d.Product).WithMany(p => p.Soitems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("SOItem_productId_fkey");

            entity.HasOne(d => d.So).WithMany(p => p.Soitems)
                .HasForeignKey(d => d.SoId)
                .HasConstraintName("SOItem_soId_fkey");
        });

        modelBuilder.Entity<SparePart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("SparePart_pkey");

            entity.ToTable("SparePart");

            entity.HasIndex(e => e.PartNo, "SparePart_partNo_idx");

            entity.HasIndex(e => e.PartNo, "SparePart_partNo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.CostPrice)
                .HasPrecision(12, 2)
                .HasColumnName("costPrice");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.OnHand)
                .HasDefaultValue(0)
                .HasColumnName("onHand");
            entity.Property(e => e.PartNo).HasColumnName("partNo");
            entity.Property(e => e.ReorderAt)
                .HasDefaultValue(0)
                .HasColumnName("reorderAt");
            entity.Property(e => e.SellPrice)
                .HasPrecision(12, 2)
                .HasColumnName("sellPrice");
            entity.Property(e => e.Unit)
                .HasDefaultValueSql("'EA'::text")
                .HasColumnName("unit");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
        });

        modelBuilder.Entity<SparePartUsage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("SparePartUsage_pkey");

            entity.ToTable("SparePartUsage");

            entity.HasIndex(e => e.SparePartId, "SparePartUsage_sparePartId_idx");

            entity.HasIndex(e => e.TicketId, "SparePartUsage_ticketId_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.PmId).HasColumnName("pmId");
            entity.Property(e => e.Qty).HasColumnName("qty");
            entity.Property(e => e.RmaId).HasColumnName("rmaId");
            entity.Property(e => e.SparePartId).HasColumnName("sparePartId");
            entity.Property(e => e.TechId).HasColumnName("techId");
            entity.Property(e => e.TicketId).HasColumnName("ticketId");

            entity.HasOne(d => d.SparePart).WithMany(p => p.SparePartUsages)
                .HasForeignKey(d => d.SparePartId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("SparePartUsage_sparePartId_fkey");
        });

        modelBuilder.Entity<StockItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("StockItem_pkey");

            entity.ToTable("StockItem");

            entity.HasIndex(e => e.ProductId, "StockItem_productId_idx");

            entity.HasIndex(e => e.ProductId, "StockItem_productId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.OnHand)
                .HasDefaultValue(0)
                .HasColumnName("onHand");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.ReorderAt)
                .HasDefaultValue(0)
                .HasColumnName("reorderAt");
            entity.Property(e => e.Reserved)
                .HasDefaultValue(0)
                .HasColumnName("reserved");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.Product).WithOne(p => p.StockItem)
                .HasForeignKey<StockItem>(d => d.ProductId)
                .HasConstraintName("StockItem_productId_fkey");
        });

        modelBuilder.Entity<StockReservation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("StockReservation_pkey");

            entity.ToTable("StockReservation");

            entity.HasIndex(e => e.ProductId, "StockReservation_productId_idx");

            entity.HasIndex(e => e.SoId, "StockReservation_soId_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ConsumedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("consumedAt");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("expiresAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.ProductId).HasColumnName("productId");
            entity.Property(e => e.Qty).HasColumnName("qty");
            entity.Property(e => e.ReleasedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("releasedAt");
            entity.Property(e => e.SoId).HasColumnName("soId");
            entity.Property(e => e.SoItemId).HasColumnName("soItemId");
            entity.Property(e => e.StockItemId).HasColumnName("stockItemId");

            entity.HasOne(d => d.StockItem).WithMany(p => p.StockReservations)
                .HasForeignKey(d => d.StockItemId)
                .HasConstraintName("StockReservation_stockItemId_fkey");
        });

        modelBuilder.Entity<TechLocation>(entity =>
        {
            entity.HasKey(e => e.TechId).HasName("TechLocation_pkey");

            entity.ToTable("TechLocation");

            entity.Property(e => e.TechId).HasColumnName("techId");
            entity.Property(e => e.Accuracy).HasColumnName("accuracy");
            entity.Property(e => e.ActiveTicketId).HasColumnName("activeTicketId");
            entity.Property(e => e.Lat)
                .HasPrecision(10, 7)
                .HasColumnName("lat");
            entity.Property(e => e.Lng)
                .HasPrecision(10, 7)
                .HasColumnName("lng");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.Tech).WithOne(p => p.TechLocation)
                .HasForeignKey<TechLocation>(d => d.TechId)
                .HasConstraintName("TechLocation_techId_fkey");
        });

        modelBuilder.Entity<TicketEvent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("TicketEvent_pkey");

            entity.ToTable("TicketEvent");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActorId).HasColumnName("actorId");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.TicketId).HasColumnName("ticketId");

            entity.HasOne(d => d.Actor).WithMany(p => p.TicketEvents)
                .HasForeignKey(d => d.ActorId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("TicketEvent_actorId_fkey");

            entity.HasOne(d => d.Ticket).WithMany(p => p.TicketEvents)
                .HasForeignKey(d => d.TicketId)
                .HasConstraintName("TicketEvent_ticketId_fkey");
        });

        modelBuilder.Entity<TicketPhoto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("TicketPhoto_pkey");

            entity.ToTable("TicketPhoto");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.S3Key).HasColumnName("s3Key");
            entity.Property(e => e.Size).HasColumnName("size");
            entity.Property(e => e.TicketId).HasColumnName("ticketId");

            entity.HasOne(d => d.Ticket).WithMany(p => p.TicketPhotos)
                .HasForeignKey(d => d.TicketId)
                .HasConstraintName("TicketPhoto_ticketId_fkey");
        });

        modelBuilder.Entity<TicketVideo>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("TicketVideo_pkey");

            entity.ToTable("TicketVideo");

            entity.HasIndex(e => e.TicketId, "TicketVideo_ticketId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Duration).HasColumnName("duration");
            entity.Property(e => e.S3Key).HasColumnName("s3Key");
            entity.Property(e => e.Size).HasColumnName("size");
            entity.Property(e => e.TicketId).HasColumnName("ticketId");

            entity.HasOne(d => d.Ticket).WithOne(p => p.TicketVideo)
                .HasForeignKey<TicketVideo>(d => d.TicketId)
                .HasConstraintName("TicketVideo_ticketId_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("User_pkey");

            entity.ToTable("User");

            entity.HasIndex(e => e.Email, "User_email_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.PasswordHash).HasColumnName("passwordHash");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Skills)
                .HasDefaultValueSql("'{}'::text[]")
                .HasColumnName("skills");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
        });

        modelBuilder.Entity<WarrantyRenewal>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("WarrantyRenewal_pkey");

            entity.ToTable("WarrantyRenewal");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("assetId");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.NewEndDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("newEndDate");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("paidAt");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.Type).HasColumnName("type");

            entity.HasOne(d => d.Asset).WithMany(p => p.WarrantyRenewals)
                .HasForeignKey(d => d.AssetId)
                .HasConstraintName("WarrantyRenewal_assetId_fkey");
        });

        modelBuilder.Entity<WmsStockCache>(entity =>
        {
            entity.HasKey(e => new { e.Sku, e.Warehouse }).HasName("WmsStockCache_pkey");

            entity.ToTable("WmsStockCache");

            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.Warehouse).HasColumnName("warehouse");
            entity.Property(e => e.Qty).HasColumnName("qty");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
        });

        modelBuilder.Entity<WmsSyncLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("WmsSyncLog_pkey");

            entity.ToTable("WmsSyncLog");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action).HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Entity).HasColumnName("entity");
            entity.Property(e => e.ErrorMsg).HasColumnName("errorMsg");
            entity.Property(e => e.RequestJson)
                .HasColumnType("jsonb")
                .HasColumnName("requestJson");
            entity.Property(e => e.ResponseJson)
                .HasColumnType("jsonb")
                .HasColumnName("responseJson");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
