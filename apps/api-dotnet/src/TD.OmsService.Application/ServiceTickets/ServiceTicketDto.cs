using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.ServiceTickets;

public sealed record ServiceTicketDto(
    string Id,
    string TicketNo,
    string CustomerId,
    string AssetId,
    string Description,
    ProblemType ProblemType,
    Priority Priority,
    TicketStage Stage,
    string? AssignedTechId,
    DateTime? SlaDueAt,
    DateTime? ClosedAt,
    int? CustomerRating,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record ServiceTicketListItem(string Id, string TicketNo, string CustomerId, ProblemType ProblemType, Priority Priority, TicketStage Stage);

public sealed record UpdateTicketStageRequest(TicketStage Stage);

public sealed record AssignTechRequest(string TechId);
