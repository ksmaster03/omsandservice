namespace TD.OmsService.Application.Customers;

public interface ICustomerService
{
    Task<PagedResult<CustomerListItem>> ListAsync(int page, int pageSize, string? search, CancellationToken ct);
    Task<CustomerDto?> GetAsync(string id, CancellationToken ct);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest req, CancellationToken ct);
    Task<CustomerDto?> UpdateAsync(string id, UpdateCustomerRequest req, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
}
