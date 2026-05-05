using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.CustomerPortal;

public sealed record MyAssetItem(string Id, string SerialNo, string ProductName, DateTime InstalledAt, DateTime WarrantyEnd, DateTime? NextPmDate);

public sealed record MyTicketItem(string Id, string TicketNo, string AssetSerialNo, ProblemType ProblemType, Priority Priority, TicketStage Stage, DateTime CreatedAt);

public sealed record MyRenewalItem(string Id, string AssetSerialNo, RenewalStatus Status, decimal Price, DateTime? NewEndDate);

public sealed record CreateMyTicketRequest(
    string AssetId,
    ProblemType ProblemType,
    Priority Priority,
    string Description,
    string? LocationDetail);

public sealed record MyProfileSummary(string Id, string CustomerId, string Phone, string DisplayName, string? Email);
