using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Renewals;

public sealed record RenewalDto(string Id, string AssetId, RenewalStatus Status, string Type, decimal Price, DateTime? NewEndDate, DateTime? PaidAt, DateTime CreatedAt);
public sealed record RenewalListItem(string Id, string AssetId, RenewalStatus Status, decimal Price, DateTime? NewEndDate);
