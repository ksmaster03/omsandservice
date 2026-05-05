using Microsoft.EntityFrameworkCore;
using TD.OmsService.Application.Common;
using TD.OmsService.Application.Feedbacks;
using TD.OmsService.Domain.Common;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Feedbacks;

public sealed class FeedbackService(AppDbContext db) : IFeedbackService
{
    public async Task<PagedResult<FeedbackListItem>> ListAsync(PageQuery q, CancellationToken ct)
    {
        var query = db.Feedbacks.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(f => EF.Functions.ILike(f.Subject, $"%{s}%") || EF.Functions.ILike(f.Description, $"%{s}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(f => f.CreatedAt)
            .Skip((q.SafePage - 1) * q.SafePageSize)
            .Take(q.SafePageSize)
            .Select(f => new FeedbackListItem(f.Id, f.Type, f.Priority, f.Status, f.Subject, f.Source, f.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<FeedbackListItem>(items, total, q.SafePage, q.SafePageSize);
    }

    public async Task<FeedbackDto?> GetAsync(string id, CancellationToken ct)
    {
        var f = await db.Feedbacks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return f is null ? null : Map(f);
    }

    public async Task<FeedbackDto> CreateAsync(CreateFeedbackRequest req, string? submittedBy, CancellationToken ct)
    {
        var entity = new Persistence.Generated.Feedback
        {
            Id = Guid.NewGuid().ToString(),
            Type = req.Type,
            Priority = req.Priority ?? FeedbackPriority.MEDIUM,
            Status = FeedbackStatus.OPEN,
            Subject = req.Subject,
            Description = req.Description,
            Screenshot = req.Screenshot,
            Source = req.Source ?? "admin",
            SubmittedBy = submittedBy,
            SubmitterName = req.SubmitterName,
            SubmitterEmail = req.SubmitterEmail,
            Attachments = req.AttachmentsJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Feedbacks.Add(entity);
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<FeedbackDto?> UpdateAsync(string id, UpdateFeedbackRequest req, CancellationToken ct)
    {
        var entity = await db.Feedbacks.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (entity is null) return null;
        if (req.Status.HasValue) entity.Status = req.Status.Value;
        if (req.Priority.HasValue) entity.Priority = req.Priority.Value;
        if (req.AssignedTo is not null) entity.AssignedTo = req.AssignedTo;
        if (req.Resolution is not null)
        {
            entity.Resolution = req.Resolution;
            if (entity.Status == FeedbackStatus.RESOLVED || entity.Status == FeedbackStatus.CLOSED)
                entity.ResolvedAt = DateTime.UtcNow;
        }
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(entity);
    }

    private static FeedbackDto Map(Persistence.Generated.Feedback f) => new(
        f.Id, f.Type, f.Priority, f.Status, f.Subject, f.Description, f.Screenshot,
        f.Source, f.SubmittedBy, f.SubmitterName, f.SubmitterEmail, f.AssignedTo,
        f.Resolution, f.Attachments, f.ResolvedAt, f.CreatedAt, f.UpdatedAt);
}
