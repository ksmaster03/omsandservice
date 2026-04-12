/**
 * System settings routes — ADMIN only.
 *
 * Manages key-value settings stored in the Setting table.
 * Sensitive values (passwords, tokens) are masked in GET responses
 * and only stored on PUT. The WMS client + notification adapters
 * read from these settings at runtime so changes take effect
 * without restarting the server.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const SENSITIVE_KEYS = new Set([
  'wms.password',
  'wms.apiKey',
  'line.channelSecret',
  'line.channelAccessToken',
  'payment.secretKey',
]);

function mask(value: string): string {
  if (value.length <= 4) return '••••';
  return value.slice(0, 2) + '•'.repeat(Math.min(value.length - 4, 20)) + value.slice(-2);
}

// All integration config keys with defaults + descriptions
const CONFIG_SCHEMA: Array<{
  key: string;
  label: string;
  group: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
}> = [
  // WMS
  { key: 'wms.baseUrl', label: 'WMS API Base URL', group: 'WMS', type: 'url', placeholder: 'https://demo.toptierwms.com/TI.WMS23.MobileApi' },
  { key: 'wms.username', label: 'WMS Username', group: 'WMS', type: 'text' },
  { key: 'wms.password', label: 'WMS Password', group: 'WMS', type: 'password' },
  { key: 'wms.apiKey', label: 'WMS API Key (auto = ระบบขอเอง)', group: 'WMS', type: 'text', placeholder: 'auto' },
  // LINE OA
  { key: 'line.channelId', label: 'LINE Channel ID', group: 'LINE OA', type: 'text' },
  { key: 'line.channelSecret', label: 'LINE Channel Secret', group: 'LINE OA', type: 'password' },
  { key: 'line.channelAccessToken', label: 'LINE Channel Access Token', group: 'LINE OA', type: 'password' },
  // Payment
  { key: 'payment.provider', label: 'Payment Provider (omise / 2c2p / none)', group: 'Payment', type: 'text', placeholder: 'none' },
  { key: 'payment.publicKey', label: 'Payment Public Key', group: 'Payment', type: 'text' },
  { key: 'payment.secretKey', label: 'Payment Secret Key', group: 'Payment', type: 'password' },
  // Google
  { key: 'google.clientId', label: 'Google OAuth Client ID', group: 'Google', type: 'text' },
];

const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('ADMIN'));

  /** GET /settings/integrations — list all integration config (masked) */
  app.get('/integrations', async () => {
    const rows = await prisma.setting.findMany({
      where: { key: { in: CONFIG_SCHEMA.map((c) => c.key) } },
    });
    const map = new Map(rows.map((r) => [r.key, r]));

    const result = CONFIG_SCHEMA.map((schema) => {
      const row = map.get(schema.key);
      const raw = row?.value ?? '';
      const isSensitive = SENSITIVE_KEYS.has(schema.key);
      return {
        ...schema,
        value: isSensitive && raw ? mask(raw) : raw,
        hasValue: !!raw,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    });

    return { ok: true, data: result };
  });

  /** PUT /settings/integrations — bulk update */
  const updateSchema = z.object({
    settings: z.array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      }),
    ),
  });
  app.put('/integrations', async (req, reply) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const validKeys = new Set(CONFIG_SCHEMA.map((c) => c.key));
    const updates = parsed.data.settings.filter((s) => validKeys.has(s.key));

    for (const { key, value } of updates) {
      // Skip if value is masked placeholder (user didn't change it)
      if (SENSITIVE_KEYS.has(key) && /^.{0,2}•+.{0,2}$/.test(value)) continue;

      await prisma.setting.upsert({
        where: { key },
        update: { value, updatedBy: req.authUser!.id },
        create: { key, value, updatedBy: req.authUser!.id },
      });
    }

    return { ok: true, data: { updated: updates.length } };
  });

  /** GET /settings/integrations/schema — config schema for UI */
  app.get('/integrations/schema', async () => {
    return { ok: true, data: CONFIG_SCHEMA };
  });
};

export default settingsRoutes;
