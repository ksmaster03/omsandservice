using TD.OmsService.Domain.Common;

namespace TD.OmsService.Application.ServiceAgreements;

public sealed record ServiceAgreementDto(string Id, string CustomerId, ServiceAgreementStatus Status, DateTime StartDate, DateTime EndDate);
public sealed record ServiceAgreementListItem(string Id, string CustomerId, ServiceAgreementStatus Status, DateTime EndDate);
