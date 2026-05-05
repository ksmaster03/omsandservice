using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using TD.OmsService.Application.Auth;

namespace TD.OmsService.Infrastructure.Auth;

/// <summary>
/// Mirrors apps/api/src/lib/google-auth.ts (Google) and the LINE Login flow.
/// Google: Google.Apis.Auth validates the JWT signature against Google's JWKS
/// and checks audience == GOOGLE_CLIENT_ID. LINE: there is no offline JWKS we
/// can reuse cheaply, so we POST to LINE's /oauth2/v2.1/verify endpoint
/// (documented at https://developers.line.biz/en/reference/line-login/#verify-id-token).
/// </summary>
public sealed class ExternalAuthClient(IConfiguration config, IHttpClientFactory httpFactory) : IExternalAuthClient
{
    private readonly string? _googleClientId = config["ExternalAuth:GoogleClientId"];
    private readonly string? _lineChannelId = config["ExternalAuth:LineChannelId"];

    public async Task<ExternalProfile> VerifyGoogleIdTokenAsync(string idToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_googleClientId))
            throw new InvalidOperationException("ExternalAuth:GoogleClientId is not configured");

        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _googleClientId },
        };
        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        if (string.IsNullOrEmpty(payload.Subject) || string.IsNullOrEmpty(payload.Email))
            throw new InvalidOperationException("Google ID token missing sub or email");

        return new ExternalProfile(
            Provider: "google",
            SubjectId: payload.Subject,
            Email: payload.Email,
            EmailVerified: payload.EmailVerified,
            Name: payload.Name ?? payload.Email,
            PictureUrl: payload.Picture);
    }

    public async Task<ExternalProfile> VerifyLineIdTokenAsync(string idToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_lineChannelId))
            throw new InvalidOperationException("ExternalAuth:LineChannelId is not configured");

        using var http = httpFactory.CreateClient();
        using var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("id_token", idToken),
            new KeyValuePair<string, string>("client_id", _lineChannelId),
        });
        using var resp = await http.PostAsync("https://api.line.me/oauth2/v2.1/verify", content, ct);
        resp.EnsureSuccessStatusCode();
        var payload = await resp.Content.ReadFromJsonAsync<LineVerifyResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("LINE verify response was empty");
        if (string.IsNullOrEmpty(payload.Sub))
            throw new InvalidOperationException("LINE ID token missing sub");

        return new ExternalProfile(
            Provider: "line",
            SubjectId: payload.Sub,
            Email: payload.Email ?? string.Empty,
            EmailVerified: !string.IsNullOrEmpty(payload.Email),
            Name: payload.Name ?? payload.Sub,
            PictureUrl: payload.Picture);
    }

    private sealed record LineVerifyResponse(
        [property: JsonPropertyName("sub")] string Sub,
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("picture")] string? Picture);
}
