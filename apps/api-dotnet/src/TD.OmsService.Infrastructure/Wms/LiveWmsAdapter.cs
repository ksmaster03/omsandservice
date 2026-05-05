using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TD.OmsService.Application.Wms;
using TD.OmsService.Infrastructure.Persistence;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// HTTP adapter for Toptier WMS MobileApi. Port of
/// apps/api/src/adapters/wms/wms-client.ts including the 3-step auth flow:
///
///   1. GET  /api/AboutApi/GetKey?username=X       → returns apiKey (text)
///   2. POST /api/Authorization/UserLogin?...      → returns { AuthSid }
///      (call MUST include ?apikey=X from step 1)
///   3. All subsequent calls append ?apikey=X      (NOT _apikey, contrary to docs)
///
/// On 401 or response body containing "Invalid API-key", reset state and
/// re-auth once before failing. Credentials are read from the Settings table
/// (`wms.baseUrl`, `wms.username`, `wms.password`) with fallback to
/// IConfiguration (`Wms:BaseUrl`, `Wms:Username`, `Wms:Password`).
///
/// Lifetime: registered as a singleton so apiKey + authSid persist across
/// requests; thread-safe via SemaphoreSlim around ensureAuth.
/// </summary>
public sealed class LiveWmsAdapter : IWmsAdapter
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<LiveWmsAdapter> _log;
    private readonly SemaphoreSlim _authGate = new(1, 1);

    private string? _baseUrl;
    private string? _apiKey;
    private string? _authSid;

    public LiveWmsAdapter(
        IHttpClientFactory httpFactory,
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<LiveWmsAdapter> log)
    {
        _httpFactory = httpFactory;
        _scopeFactory = scopeFactory;
        _config = config;
        _log = log;
    }

    public string Mode => "live";

    public async Task<bool> HealthCheckAsync(CancellationToken ct)
    {
        try
        {
            using var resp = await RawGetAsync("/api/AboutApi/IsConnect", apiKey: null, ct);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "WMS health check failed");
            return false;
        }
    }

    public async Task<string?> GetVersionAsync(CancellationToken ct)
    {
        try
        {
            using var resp = await RawGetAsync("/api/AboutApi/Version", apiKey: null, ct);
            if (!resp.IsSuccessStatusCode) return null;
            return (await resp.Content.ReadAsStringAsync(ct)).Trim('"');
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct)
    {
        var parts = await GetAsync<List<WmsPart>>("/api/PartApi/GetParts", ct);
        return parts ?? new List<WmsPart>();
    }

    public Task<WmsStock?> GetStockAsync(string sku, CancellationToken ct) =>
        GetAsync<WmsStock?>($"/api/StockApi/GetStock?sku={Uri.EscapeDataString(sku)}", ct);

    public Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct) =>
        PostAsync<object>("/api/ReceiptApi/ScanIn", req, ct);

    public Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct) =>
        PostAsync<object>("/api/OrderApi/ScanOut", req, ct);

    public Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct) =>
        PostAsync<object>("/api/OrderApi/Close", req, ct);

    public Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct) =>
        PostAsync<object>("/api/InventoryApi/Count", req, ct);

    // ───────────────────────────────────────────────────────
    // Auth
    // ───────────────────────────────────────────────────────

    private async Task EnsureAuthAsync(CancellationToken ct)
    {
        if (_apiKey is not null && _authSid is not null) return;

        await _authGate.WaitAsync(ct);
        try
        {
            if (_apiKey is not null && _authSid is not null) return;
            await AuthenticateAsync(ct);
        }
        finally
        {
            _authGate.Release();
        }
    }

    private async Task AuthenticateAsync(CancellationToken ct)
    {
        var (baseUrl, username, password) = await ReadCredentialsAsync(ct);
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new InvalidOperationException("WMS base URL not configured (Settings.wms.baseUrl or Wms:BaseUrl)");
        if (string.IsNullOrWhiteSpace(username))
            throw new InvalidOperationException("WMS username not configured (Settings.wms.username or Wms:Username)");

        // Strip trailing /api or / so paths can include /api/ themselves
        _baseUrl = Regex.Replace(baseUrl.TrimEnd('/'), "/api/?$", string.Empty, RegexOptions.IgnoreCase);

        // Step 1 — GetKey
        using var keyResp = await RawGetAsync($"/api/AboutApi/GetKey?username={Uri.EscapeDataString(username)}", apiKey: null, ct);
        if (!keyResp.IsSuccessStatusCode)
        {
            var err = await keyResp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"WMS GetKey failed: {(int)keyResp.StatusCode} {err}");
        }
        var key = (await keyResp.Content.ReadAsStringAsync(ct)).Trim().Trim('"');
        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException("WMS GetKey returned empty body");
        _apiKey = key;

        // Step 2 — UserLogin
        var loginPath = $"/api/Authorization/UserLogin?userId={Uri.EscapeDataString(username)}&password={Uri.EscapeDataString(password ?? string.Empty)}&deviceName=ToptierOSM&ip=server";
        using var loginResp = await RawPostAsync(loginPath, _apiKey, body: null, ct);
        if (!loginResp.IsSuccessStatusCode)
        {
            var err = await loginResp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"WMS UserLogin failed: {(int)loginResp.StatusCode} {err}");
        }
        using var loginDoc = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync(ct));
        if (loginDoc.RootElement.TryGetProperty("AuthSid", out var sid) || loginDoc.RootElement.TryGetProperty("authSid", out sid))
            _authSid = sid.GetString();
        if (string.IsNullOrEmpty(_authSid))
            _log.LogWarning("WMS UserLogin succeeded but AuthSid was empty in response");
    }

    private async Task<(string? baseUrl, string? username, string? password)> ReadCredentialsAsync(CancellationToken ct)
    {
        // DB settings take priority over IConfiguration (matches Node).
        string? dbUrl = null, dbUser = null, dbPass = null;
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var rows = await db.Settings.AsNoTracking()
                .Where(s => s.Key == "wms.baseUrl" || s.Key == "wms.username" || s.Key == "wms.password")
                .ToListAsync(ct);
            dbUrl = rows.FirstOrDefault(r => r.Key == "wms.baseUrl")?.Value;
            dbUser = rows.FirstOrDefault(r => r.Key == "wms.username")?.Value;
            dbPass = rows.FirstOrDefault(r => r.Key == "wms.password")?.Value;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Could not read WMS settings from DB; falling back to IConfiguration");
        }

        return (
            string.IsNullOrEmpty(dbUrl) ? _config["Wms:BaseUrl"] : dbUrl,
            string.IsNullOrEmpty(dbUser) ? _config["Wms:Username"] : dbUser,
            string.IsNullOrEmpty(dbPass) ? _config["Wms:Password"] : dbPass);
    }

    /// <summary>Force re-auth on next call (after a credential change).</summary>
    public void ResetAuth()
    {
        _apiKey = null;
        _authSid = null;
    }

    // ───────────────────────────────────────────────────────
    // Authenticated GET/POST with auto-retry
    // ───────────────────────────────────────────────────────

    private async Task<T?> GetAsync<T>(string path, CancellationToken ct)
    {
        await EnsureAuthAsync(ct);
        using var resp1 = await RawGetAsync(path, _apiKey, ct);
        var text = await resp1.Content.ReadAsStringAsync(ct);
        if (resp1.StatusCode == HttpStatusCode.Unauthorized || IsInvalidKey(text))
        {
            ResetAuth();
            await EnsureAuthAsync(ct);
            using var resp2 = await RawGetAsync(path, _apiKey, ct);
            text = await resp2.Content.ReadAsStringAsync(ct);
            if (!resp2.IsSuccessStatusCode)
                throw new InvalidOperationException($"WMS GET {path} → {(int)resp2.StatusCode}: {Truncate(text)}");
            return ParseResponse<T>(text);
        }
        if (!resp1.IsSuccessStatusCode)
            throw new InvalidOperationException($"WMS GET {path} → {(int)resp1.StatusCode}: {Truncate(text)}");
        return ParseResponse<T>(text);
    }

    private async Task<T> PostAsync<T>(string path, object? body, CancellationToken ct) where T : class
    {
        await EnsureAuthAsync(ct);
        using var resp1 = await RawPostAsync(path, _apiKey, body, ct);
        var text = await resp1.Content.ReadAsStringAsync(ct);
        if (resp1.StatusCode == HttpStatusCode.Unauthorized || IsInvalidKey(text))
        {
            ResetAuth();
            await EnsureAuthAsync(ct);
            using var resp2 = await RawPostAsync(path, _apiKey, body, ct);
            text = await resp2.Content.ReadAsStringAsync(ct);
            if (!resp2.IsSuccessStatusCode)
                throw new InvalidOperationException($"WMS POST {path} → {(int)resp2.StatusCode}: {Truncate(text)}");
            return (ParseResponse<T>(text) ?? throw new InvalidOperationException($"WMS POST {path} returned null"));
        }
        if (!resp1.IsSuccessStatusCode)
            throw new InvalidOperationException($"WMS POST {path} → {(int)resp1.StatusCode}: {Truncate(text)}");
        return (ParseResponse<T>(text) ?? throw new InvalidOperationException($"WMS POST {path} returned null"));
    }

    private static bool IsInvalidKey(string body) => body.Contains("Invalid API-key", StringComparison.Ordinal);
    private static string Truncate(string s) => s.Length <= 300 ? s : s[..300];

    private static T? ParseResponse<T>(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return default;
        try
        {
            using var doc = JsonDocument.Parse(text);
            // Toptier WMS often wraps results in { Data: ... } envelope
            var root = doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("Data", out var data)
                ? data
                : doc.RootElement;
            return JsonSerializer.Deserialize<T>(root.GetRawText());
        }
        catch
        {
            // Some endpoints return plain text — try to coerce
            if (typeof(T) == typeof(string)) return (T)(object)text;
            return default;
        }
    }

    // ───────────────────────────────────────────────────────
    // Raw HTTP — appends ?apikey=X (Toptier uses 'apikey', NOT '_apikey')
    // ───────────────────────────────────────────────────────

    private string AppendKey(string path, string? apiKey)
    {
        if (string.IsNullOrEmpty(apiKey)) return path;
        var sep = path.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        return $"{path}{sep}apikey={Uri.EscapeDataString(apiKey)}";
    }

    private async Task<HttpResponseMessage> RawGetAsync(string path, string? apiKey, CancellationToken ct)
    {
        var http = _httpFactory.CreateClient("wms");
        http.Timeout = TimeSpan.FromSeconds(15);
        var url = (_baseUrl ?? string.Empty) + AppendKey(path, apiKey);
        using var msg = new HttpRequestMessage(HttpMethod.Get, url);
        msg.Headers.Accept.ParseAdd("application/json");
        return await http.SendAsync(msg, ct);
    }

    private async Task<HttpResponseMessage> RawPostAsync(string path, string? apiKey, object? body, CancellationToken ct)
    {
        var http = _httpFactory.CreateClient("wms");
        http.Timeout = TimeSpan.FromSeconds(15);
        var url = (_baseUrl ?? string.Empty) + AppendKey(path, apiKey);
        var msg = new HttpRequestMessage(HttpMethod.Post, url);
        msg.Headers.Accept.ParseAdd("application/json");
        msg.Content = body is null
            ? new StringContent("{}", Encoding.UTF8, "application/json")
            : JsonContent.Create(body);
        return await http.SendAsync(msg, ct);
    }
}
