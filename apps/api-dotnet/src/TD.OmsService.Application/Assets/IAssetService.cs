using TD.OmsService.Application.Common;

namespace TD.OmsService.Application.Assets;

public interface IAssetService
{
    Task<PagedResult<AssetListItem>> ListAsync(PageQuery q, CancellationToken ct);
    Task<AssetDto?> GetAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<AssetListItem>> ListByCustomerAsync(string customerId, CancellationToken ct);
}
