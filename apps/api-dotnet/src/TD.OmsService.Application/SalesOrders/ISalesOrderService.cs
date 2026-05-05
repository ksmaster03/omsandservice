using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.SalesOrders;

public interface ISalesOrderService
{
    Task<PagedResult<SalesOrderListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<SalesOrderDto?> GetAsync(string id, CancellationToken ct);
}
