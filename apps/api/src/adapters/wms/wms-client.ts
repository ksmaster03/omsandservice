/**
 * Low-level HTTP client for Toptier WMS MobileApi.
 *
 * Auth flow:
 *   1. GET /api/AboutApi/GetKey?username=xxx   → apiKey
 *   2. POST /api/Authorization/UserLogin       → authSid (session)
 *   3. All subsequent calls include apiKey in header/query
 *
 * Auto-reconnects on 401 by re-running the auth flow.
 */
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value || null;
  } catch {
    return null;
  }
}

export class WmsClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  private authSid: string | null = null;

  constructor() {
    this.baseUrl = (env.WMS_BASE_URL ?? '').replace(/\/$/, '');
  }

  /** Reload base URL from DB settings (called before auth) */
  private async refreshConfig(): Promise<void> {
    const dbUrl = await getSetting('wms.baseUrl');
    const raw = dbUrl ?? env.WMS_BASE_URL ?? '';
    // Strip trailing /api/ or /api and trailing slash — paths already include /api/
    this.baseUrl = raw.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }

  get isConfigured(): boolean {
    return !!this.baseUrl;
  }

  /** GET /api/AboutApi/IsConnect */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.rawGet('/api/AboutApi/IsConnect');
      return res.ok;
    } catch {
      return false;
    }
  }

  /** GET /api/AboutApi/Version */
  async getVersion(): Promise<string> {
    const res = await this.rawGet('/api/AboutApi/Version');
    return res.text();
  }

  /** Ensure we have a valid apiKey + authSid. Idempotent. */
  async ensureAuth(): Promise<void> {
    if (this.apiKey && this.authSid) return;
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    await this.refreshConfig();

    // Read credentials: DB settings take priority over env vars
    const username = (await getSetting('wms.username')) ?? env.WMS_USERNAME;
    const password = (await getSetting('wms.password')) ?? env.WMS_PASSWORD ?? '';

    if (!username) throw new Error('WMS username not configured — set via Settings > Integrations');

    // Step 1: Get API key
    const keyRes = await this.rawGet(
      `/api/AboutApi/GetKey?username=${encodeURIComponent(username)}`,
    );
    if (!keyRes.ok) {
      throw new Error(`WMS GetKey failed: ${keyRes.status} ${await keyRes.text()}`);
    }
    this.apiKey = await keyRes.text();
    this.apiKey = this.apiKey.replace(/^"|"$/g, '');

    // Step 2: Login (must include apikey!)
    const loginRes = await this.rawPost(
      `/api/Authorization/UserLogin?userId=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&deviceName=ToptierOSM&ip=server`,
      this.apiKey!,
    );
    if (!loginRes.ok) {
      throw new Error(`WMS UserLogin failed: ${loginRes.status} ${await loginRes.text()}`);
    }
    const loginData = (await loginRes.json()) as Record<string, unknown>;
    this.authSid = String(loginData?.AuthSid ?? loginData?.authSid ?? '');
  }

  /** Force re-auth on next call (e.g. after credential change) */
  resetAuth(): void {
    this.apiKey = null;
    this.authSid = null;
  }

  private parseResponse<T>(text: string): T {
    try {
      const json = JSON.parse(text);
      if (json && typeof json === 'object' && 'Data' in json) return json.Data as T;
      return json as T;
    } catch {
      return text as unknown as T;
    }
  }

  private isInvalidKey(text: string): boolean {
    return text.includes('Invalid API-key');
  }

  /** Authenticated GET — auto-retries auth on invalid key */
  async get<T = unknown>(path: string): Promise<T> {
    await this.ensureAuth();
    let res = await this.rawGet(path, this.apiKey!);
    let text = await res.text();
    if (res.status === 401 || this.isInvalidKey(text)) {
      this.apiKey = null;
      this.authSid = null;
      await this.ensureAuth();
      res = await this.rawGet(path, this.apiKey!);
      text = await res.text();
    }
    if (!res.ok) {
      throw new Error(`WMS GET ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return this.parseResponse<T>(text);
  }

  /** Authenticated POST — auto-retries auth on invalid key */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    await this.ensureAuth();
    let res = await this.rawPost(path, this.apiKey!, body);
    let text = await res.text();
    if (res.status === 401 || this.isInvalidKey(text)) {
      this.apiKey = null;
      this.authSid = null;
      await this.ensureAuth();
      res = await this.rawPost(path, this.apiKey!, body);
      text = await res.text();
    }
    if (!res.ok) {
      throw new Error(`WMS POST ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return this.parseResponse<T>(text);
  }

  // ─── Raw HTTP helpers ────────────────────────────────────
  // WMS API uses 'apikey' as query parameter (NOT '_apikey' as doc claims).
  private appendKey(path: string, apiKey?: string): string {
    if (!apiKey) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}apikey=${encodeURIComponent(apiKey)}`;
  }

  private rawGet(path: string, apiKey?: string): Promise<Response> {
    return fetch(`${this.baseUrl}${this.appendKey(path, apiKey)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  }

  private rawPost(path: string, apiKey?: string, body?: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${this.appendKey(path, apiKey)}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : '{}',
      signal: AbortSignal.timeout(15_000),
    });
  }
}

export const wmsClient = new WmsClient();
