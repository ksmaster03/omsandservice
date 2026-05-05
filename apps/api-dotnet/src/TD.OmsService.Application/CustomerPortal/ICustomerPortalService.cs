namespace TD.OmsService.Application.CustomerPortal;

public interface ICustomerPortalService
{
    Task<MyProfileSummary?> MeAsync(string customerUserId, CancellationToken ct);
    Task<IReadOnlyList<MyAssetItem>> MyAssetsAsync(string customerId, CancellationToken ct);
    Task<IReadOnlyList<MyTicketItem>> MyTicketsAsync(string customerId, CancellationToken ct);
    Task<IReadOnlyList<MyRenewalItem>> MyRenewalsAsync(string customerId, CancellationToken ct);
    Task<MyTicketItem> CreateMyTicketAsync(string customerId, CreateMyTicketRequest req, CancellationToken ct);
}
