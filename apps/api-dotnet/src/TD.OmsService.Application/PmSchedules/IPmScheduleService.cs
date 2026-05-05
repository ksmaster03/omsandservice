using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.PmSchedules;

public interface IPmScheduleService
{
    Task<PagedResult<PmScheduleListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<PmScheduleDto?> GetAsync(string id, CancellationToken ct);
}
