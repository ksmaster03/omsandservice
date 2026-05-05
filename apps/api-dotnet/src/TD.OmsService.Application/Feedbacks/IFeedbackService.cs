using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Feedbacks;

public interface IFeedbackService
{
    Task<PagedResult<FeedbackListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<FeedbackDto?> GetAsync(string id, CancellationToken ct);
    Task<FeedbackDto> CreateAsync(CreateFeedbackRequest req, string? submittedBy, CancellationToken ct);
    Task<FeedbackDto?> UpdateAsync(string id, UpdateFeedbackRequest req, CancellationToken ct);
}
