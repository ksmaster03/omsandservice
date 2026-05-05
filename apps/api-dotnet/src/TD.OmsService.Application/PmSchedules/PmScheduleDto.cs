using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.PmSchedules;

public sealed record PmScheduleDto(
    string Id,
    string AssetId,
    string? TechId,
    PmStatus Status,
    DateTime ScheduledAt,
    DateTime? CompletedAt,
    string? Note);

public sealed record PmScheduleListItem(string Id, string AssetId, PmStatus Status, DateTime ScheduledAt);
