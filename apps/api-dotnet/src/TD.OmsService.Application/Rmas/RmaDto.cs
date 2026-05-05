using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Rmas;

public sealed record RmaDto(
    string Id,
    string RmaNo,
    string CustomerId,
    string AssetId,
    RmaReason Reason,
    RmaStage Stage,
    RmaResolution? Resolution,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record RmaListItem(string Id, string RmaNo, string CustomerId, RmaReason Reason, RmaStage Stage);

public sealed record UpdateRmaStageRequest(RmaStage Stage, RmaResolution? Resolution);
