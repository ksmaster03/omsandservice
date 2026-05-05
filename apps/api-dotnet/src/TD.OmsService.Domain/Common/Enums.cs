namespace TD.OmsService.Domain.Common;

/// <summary>
/// Mirror Prisma's Postgres native enum types. Names and member order MUST
/// match the schema exactly so Npgsql can map them via NpgsqlDataSourceBuilder.MapEnum&lt;T&gt;.
/// </summary>
public enum Brand { MAXNUM, GORILLA_TECK, ANYFIT, IMPULSE }
public enum CustomerType { INDIVIDUAL, CORPORATE }
public enum DemoStatus { SCHEDULED, COMPLETED, CANCELLED, NO_SHOW }
public enum FeedbackPriority { LOW, MEDIUM, HIGH, CRITICAL }
public enum FeedbackStatus { OPEN, IN_PROGRESS, RESOLVED, CLOSED, WONT_FIX }
public enum FeedbackType { BUG, FEATURE, IMPROVEMENT, QUESTION, OTHER }
public enum InstallStatus { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED }
public enum LeadStage { LEAD, QUALIFIED, DEMO, QUOTE, NEGOTIATION, WON, LOST }
public enum MilestoneStatus { PENDING, DUE, PAID, OVERDUE }
public enum MsgDir { IN, OUT }
public enum PmStatus { PENDING, SCHEDULED, COMPLETED, OVERDUE, SKIPPED }
public enum Priority { URGENT, NORMAL, LOW }
public enum ProblemType { BELT, NOISE, CONSOLE, MOTOR, POWER, OTHER, PM }
public enum QuoteStatus { DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED }
public enum RenewalStatus { OFFERED, ACCEPTED, PAID, EXPIRED }
public enum RmaReason { DOA, DEFECT, WRONG_ITEM, CUSTOMER_CHANGE_MIND, WARRANTY_CLAIM, OTHER }
public enum RmaResolution { REFUND, REPLACE, REFURBISH, REJECTED }
public enum RmaStage { REQUESTED, APPROVED, REJECTED, PICKUP_SCHEDULED, PICKED_UP, INSPECTING, REFUNDED, REPLACED, REFURBISHED, CANCELLED }
public enum SOStatus { PENDING, CONFIRMED, IN_PRODUCTION, READY_TO_DELIVER, INSTALLED, COMPLETED, CANCELLED }
public enum ServiceAgreementStatus { DRAFT, ACTIVE, EXPIRED, CANCELLED }
public enum StockReservationStatus { ACTIVE, RELEASED, CONSUMED }
public enum SyncStatus { PENDING, SUCCESS, FAILED, RETRY }
public enum TicketStage { RECEIVED, ASSIGNED, EN_ROUTE, ARRIVED, REPAIRING, CLOSED, CANCELLED }
public enum UserRole { SALES, INSTALL, SERVICE, ADMIN }
