namespace TD.OmsService.Application.Leads;

/// <summary>
/// Phase 3 starter DTOs. The Postgres `LeadStage` enum is currently
/// stringly-typed here (DRAFT, QUALIFIED, DEMO, QUOTE, NEGOTIATION, WON, LOST)
/// pending Npgsql enum mapping (see AppDbContext OnModelCreating).
/// </summary>
public sealed record LeadDto(
    string Id,
    string CustomerId,
    string Stage,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateLeadRequest(string CustomerId, string Stage);

public sealed record UpdateLeadStageRequest(string Stage);

public sealed record LeadListItem(string Id, string CustomerId, string Stage);
