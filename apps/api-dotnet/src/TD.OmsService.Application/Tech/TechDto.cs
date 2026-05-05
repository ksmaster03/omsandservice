using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Tech;

public sealed record TechTicketItem(
    string Id,
    string TicketNo,
    string CustomerName,
    string CustomerPhone,
    string ProductName,
    string SerialNo,
    string Description,
    Priority Priority,
    ProblemType ProblemType,
    TicketStage Stage,
    decimal? LocationLat,
    decimal? LocationLng,
    string? LocationAddress,
    DateTime? SlaDueAt);

public sealed record TechPmItem(
    string Id,
    string AssetSerialNo,
    string CustomerName,
    PmStatus Status,
    DateTime ScheduledAt);

public sealed record GpsLocationReport(decimal Lat, decimal Lng, decimal? AccuracyMeters);
