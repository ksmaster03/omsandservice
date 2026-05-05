using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TD.OmsService.Application.Wms;

namespace TD.OmsService.Infrastructure.Wms;

/// <summary>
/// HTTP adapter for Toptier WMS MobileApi. The Node implementation in
/// apps/api/src/adapters/wms/{live-wms,wms-client}.ts handles a 3-step auth
/// flow (GetKey → UserLogin → apiKey) and JSON-only responses. This port
/// keeps the same shape but defers the deeper WMS DTO mapping to a follow-up
/// once the WMS spec stabilises (see CUTOVER.md). For now: GET via HttpClient,
/// surface raw responses as-is to the controller (which already mocks via
/// IWmsAdapter for dev).
///
/// Configuration (appsettings or env):
///   Wms:BaseUrl    — e.g. https://wms.example.com
///   Wms:Username   — for GetKey
///   Wms:ApiKey     — long-lived key (alternative to UserLogin auth)
/// </summary>
public sealed class LiveWmsAdapter : IWmsAdapter
{
    private readonly HttpClient _http;
    private readonly ILogger<LiveWmsAdapter> _log;
    private readonly string _baseUrl;
    private readonly string? _apiKey;

    public LiveWmsAdapter(IHttpClientFactory httpFactory, IConfiguration config, ILogger<LiveWmsAdapter> log)
    {
        _http = httpFactory.CreateClient("wms");
        _log = log;
        _baseUrl = (config["Wms:BaseUrl"] ?? string.Empty).TrimEnd('/');
        _apiKey = config["Wms:ApiKey"];
        if (!string.IsNullOrEmpty(_baseUrl))
        {
            _http.BaseAddress = new Uri(_baseUrl);
            if (!string.IsNullOrEmpty(_apiKey))
                _http.DefaultRequestHeaders.Add("X-Api-Key", _apiKey);
        }
    }

    public string Mode => "live";

    public async Task<bool> HealthCheckAsync(CancellationToken ct)
    {
        try
        {
            var resp = await _http.GetAsync("/api/AboutApi/IsConnect", ct);
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
            var resp = await _http.GetAsync("/api/AboutApi/GetVersion", ct);
            if (!resp.IsSuccessStatusCode) return null;
            return await resp.Content.ReadAsStringAsync(ct);
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<WmsPart>> GetPartsAsync(CancellationToken ct)
    {
        var resp = await _http.GetAsync("/api/PartApi/GetParts", ct);
        resp.EnsureSuccessStatusCode();
        var parts = await resp.Content.ReadFromJsonAsync<List<WmsPart>>(cancellationToken: ct);
        return parts ?? new List<WmsPart>();
    }

    public async Task<WmsStock?> GetStockAsync(string sku, CancellationToken ct)
    {
        var resp = await _http.GetAsync($"/api/StockApi/GetStock?sku={Uri.EscapeDataString(sku)}", ct);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<WmsStock>(cancellationToken: ct);
    }

    public Task<object> ScanInAsync(ScanInRequest req, CancellationToken ct) => PostAsync("/api/ReceiptApi/ScanIn", req, ct);
    public Task<object> ScanOutAsync(ScanOutRequest req, CancellationToken ct) => PostAsync("/api/OrderApi/ScanOut", req, ct);
    public Task<object> CloseOrderAsync(CloseOrderRequest req, CancellationToken ct) => PostAsync("/api/OrderApi/Close", req, ct);
    public Task<object> InventoryCountAsync(InventoryCountRequest req, CancellationToken ct) => PostAsync("/api/InventoryApi/Count", req, ct);

    private async Task<object> PostAsync(string path, object body, CancellationToken ct)
    {
        var resp = await _http.PostAsJsonAsync(path, body, ct);
        resp.EnsureSuccessStatusCode();
        var raw = await resp.Content.ReadAsStringAsync(ct);
        return new { raw }; // pass through — frontend already shapes from Node experience
    }
}
