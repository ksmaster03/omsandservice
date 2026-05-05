namespace TD.OmsService.Application.Assets;

public sealed record AssetDto(
    string Id,
    string SerialNo,
    string ProductId,
    string CustomerId,
    string SoId,
    DateTime InstalledAt,
    DateTime WarrantyEnd,
    DateTime? NextPmDate,
    string? LocationDetail);

public sealed record AssetListItem(string Id, string SerialNo, string CustomerId, DateTime WarrantyEnd, DateTime? NextPmDate);
