using TD.OmsService.Domain.Common;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

// Postgres native-enum columns are skipped by `dotnet ef dbcontext scaffold`,
// so we re-attach them as partial-class properties here. The DbContext's
// OnModelCreating override (in AppDbContextEnumMappings.cs) maps each
// property to its column.
//
// Keep this file in sync with Domain/Common/Enums.cs and the Prisma schema.

public partial class Customer
{
    public CustomerType Type { get; set; } = CustomerType.CORPORATE;
}

public partial class User
{
    public UserRole Role { get; set; } = UserRole.SALES;
}

public partial class Product
{
    public Brand Brand { get; set; } = Brand.MAXNUM;
}

public partial class Lead
{
    public LeadStage Stage { get; set; } = LeadStage.LEAD;
}

public partial class Quotation
{
    public QuoteStatus Status { get; set; } = QuoteStatus.DRAFT;
}

public partial class SalesOrder
{
    public SOStatus Status { get; set; } = SOStatus.PENDING;
}

public partial class PaymentMilestone
{
    public MilestoneStatus Status { get; set; } = MilestoneStatus.PENDING;
}

public partial class Demo
{
    public DemoStatus Status { get; set; } = DemoStatus.SCHEDULED;
}

public partial class Installation
{
    public InstallStatus Status { get; set; } = InstallStatus.SCHEDULED;
}

public partial class PmSchedule
{
    public PmStatus Status { get; set; } = PmStatus.PENDING;
}

public partial class WarrantyRenewal
{
    public RenewalStatus Status { get; set; } = RenewalStatus.OFFERED;
}

public partial class ServiceTicket
{
    public ProblemType ProblemType { get; set; } = ProblemType.OTHER;
    public Priority Priority { get; set; } = Priority.NORMAL;
    public TicketStage Stage { get; set; } = TicketStage.RECEIVED;
}

public partial class TicketEvent
{
    public TicketStage Stage { get; set; } = TicketStage.RECEIVED;
}

public partial class WmsSyncLog
{
    public SyncStatus Status { get; set; } = SyncStatus.PENDING;
}

public partial class LineMessage
{
    public MsgDir Direction { get; set; } = MsgDir.IN;
}

public partial class StockReservation
{
    public StockReservationStatus Status { get; set; } = StockReservationStatus.ACTIVE;
}

public partial class Rma
{
    public RmaReason Reason { get; set; } = RmaReason.OTHER;
    public RmaStage Stage { get; set; } = RmaStage.REQUESTED;
    public RmaResolution? Resolution { get; set; }
}

public partial class RmaEvent
{
    public RmaStage Stage { get; set; } = RmaStage.REQUESTED;
}

public partial class Feedback
{
    public FeedbackType Type { get; set; } = FeedbackType.OTHER;
    public FeedbackPriority Priority { get; set; } = FeedbackPriority.MEDIUM;
    public FeedbackStatus Status { get; set; } = FeedbackStatus.OPEN;
}

public partial class ServiceAgreement
{
    public ServiceAgreementStatus Status { get; set; } = ServiceAgreementStatus.DRAFT;
}
