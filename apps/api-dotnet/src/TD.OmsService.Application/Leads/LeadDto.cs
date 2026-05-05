using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Leads;

public sealed record LeadDto(
    string Id,
    string CustomerId,
    string OwnerId,
    LeadStage Stage,
    decimal Value,
    DateTime? ExpectedClose,
    string? Note,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateLeadRequest(
    string CustomerId,
    string OwnerId,
    decimal Value,
    DateTime? ExpectedClose,
    string? Note);

public sealed record UpdateLeadStageRequest(LeadStage Stage);

public sealed record LeadListItem(string Id, string CustomerId, LeadStage Stage, decimal Value);
