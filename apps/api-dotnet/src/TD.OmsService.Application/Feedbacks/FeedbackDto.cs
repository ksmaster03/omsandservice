using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.Feedbacks;

public sealed record FeedbackDto(
    string Id,
    FeedbackType Type,
    FeedbackPriority Priority,
    FeedbackStatus Status,
    string Subject,
    string Description,
    string? Screenshot,
    string Source,
    string? SubmittedBy,
    string? SubmitterName,
    string? SubmitterEmail,
    string? AssignedTo,
    string? Resolution,
    string? AttachmentsJson,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record FeedbackListItem(
    string Id,
    FeedbackType Type,
    FeedbackPriority Priority,
    FeedbackStatus Status,
    string Subject,
    string Source,
    DateTime CreatedAt);

public sealed record CreateFeedbackRequest(
    FeedbackType Type,
    string Subject,
    string Description,
    FeedbackPriority? Priority,
    string? Screenshot,
    string? Source,
    string? SubmitterName,
    string? SubmitterEmail,
    string? AttachmentsJson);

public sealed record UpdateFeedbackRequest(
    FeedbackStatus? Status,
    FeedbackPriority? Priority,
    string? AssignedTo,
    string? Resolution);
