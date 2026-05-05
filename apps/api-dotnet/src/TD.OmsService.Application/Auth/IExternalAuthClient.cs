namespace TD.OmsService.Application.Auth;

public sealed record ExternalProfile(string Provider, string SubjectId, string Email, bool EmailVerified, string Name, string? PictureUrl);

/// <summary>
/// Verifies an OAuth/OIDC ID token from an external provider (Google or LINE)
/// and returns the trusted profile claims. Implementations live in Infrastructure.
/// </summary>
public interface IExternalAuthClient
{
    Task<ExternalProfile> VerifyGoogleIdTokenAsync(string idToken, CancellationToken ct);
    Task<ExternalProfile> VerifyLineIdTokenAsync(string idToken, CancellationToken ct);
}
