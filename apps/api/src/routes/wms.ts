/**
 * WMS integration routes — proxy to Toptier WMS MobileApi.
 *
 * Phase 1: Connection + master data sync
 * Phase 2: Stock flow (receipt, scan-in/out, order close)
 * Phase 3: Container + delivery tracking + inventory count
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { wmsSyncLogListQuerySchema } from '@oms/shared';
import { adapters } from '../adapters/registry';
import type { LiveWmsAdapter } from '../adapters/wms/live-wms';
import { prisma } from '../lib/prisma';
import { logSync } from '../lib/wms';

function live(): LiveWmsAdapter {
  if (adapters.wms.mode !== 'live') {
    throw new Error('WMS is in mock mode — set WMS_BASE_URL + WMS_API_KEY in env');
  }
  return adapters.wms as LiveWmsAdapter;
}

const wmsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ════════════════════════════════════════════════════════
  // Phase 1 — Connection + Master data
  // ════════════════════════════════════════════════════════

  /** GET /wms/status — connection health + mode */
  app.get('/status', async () => {
    const mode = adapters.wms.mode;
    if (mode === 'mock') {
      return { ok: true, data: { mode: 'mock', connected: 'simulated' } };
    }
    try {
      const wms = live();
      const connected = await wms.healthCheck();
      const version = connected ? await wms.getVersion() : null;
      return { ok: true, data: { mode, connected: connected ? 'yes' : 'no', version } };
    } catch (err) {
      return { ok: true, data: { mode, connected: 'error', error: String(err) } };
    }
  });

  /** GET /wms/parts — list parts from WMS */
  app.get('/parts', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      const data = await live().getParts();
      return { ok: true, data };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/warehouses */
  app.get('/warehouses', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      const data = await live().getWarehouses();
      return { ok: true, data };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/locations */
  app.get('/locations', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      const data = await live().getLocations();
      return { ok: true, data };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /**
   * POST /wms/sync-products — two modes:
   *   { mode: "preview" }  → dry run: show what would be created/linked
   *   { mode: "confirm" }  → actually create/link products
   *
   * Brand detection: parse WMS Description for known brand names.
   * Category detection: parse WMS Part.Name prefix (R=Treadmill, C=Bike, etc).
   */
  const BRAND_MAP: Record<string, string> = {
    'gorilla teck': 'GORILLA_TECK',
    'maxnum': 'MAXNUM',
    'impulse': 'IMPULSE',
    'anyfit': 'ANYFIT',
  };
  const CATEGORY_MAP: Record<string, string> = {
    R: 'Treadmill',
    C: 'Bike',
    W: 'Elliptical',
    SM: 'Strength Machine',
    FASCO: 'Motor/Parts',
  };

  function detectBrand(desc: string): string {
    const lower = (desc || '').toLowerCase();
    for (const [keyword, brand] of Object.entries(BRAND_MAP)) {
      if (lower.includes(keyword)) return brand;
    }
    return 'MAXNUM'; // default
  }

  function detectCategory(sku: string): string {
    const match = (sku || '').match(/^([A-Z]+)/);
    const pfx = match?.[1];
    if (pfx && pfx in CATEGORY_MAP) return CATEGORY_MAP[pfx]!;
    return 'Other';
  }

  const syncProductsSchema = z.object({
    mode: z.enum(['preview', 'confirm']),
    filter: z.string().optional(), // SKU prefix filter e.g. "R,C,W" — empty = all
  });

  app.post('/sync-products', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = syncProductsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'mode required (preview or confirm)' } });
    }
    const { mode, filter } = parsed.data;

    try {
      const wmsParts = await logSync('sync_products', 'pull', { mode, filter }, () => live().getParts());

      // Apply prefix filter if provided
      const prefixes = filter ? filter.split(',').map(s => s.trim().toUpperCase()) : [];
      const filtered = prefixes.length > 0
        ? wmsParts.filter((p: { Name?: string }) => {
            const name = p.Name || '';
            return prefixes.some(pfx => name.startsWith(pfx));
          })
        : wmsParts;

      // Match against local products by SKU or wmsPartNo
      const results: Array<{
        wmsId: number;
        wmsSku: string;
        wmsName: string;
        status: 'matched' | 'to_create' | 'created' | 'linked';
        localProductId?: string;
        localSku?: string;
        detectedBrand?: string;
        detectedCategory?: string;
      }> = [];

      for (const part of filtered) {
        const wmsSku = String(part.Name || '');
        const wmsDesc = String(part.Description || '');
        const wmsId = part.Id as number;

        // Try match by wmsPartNo first, then by SKU
        let local = await prisma.product.findFirst({ where: { wmsPartNo: wmsSku } });
        if (!local) local = await prisma.product.findFirst({ where: { sku: wmsSku } });

        if (local) {
          // Already linked or matched
          if (!local.wmsPartNo) {
            if (mode === 'confirm') {
              await prisma.product.update({ where: { id: local.id }, data: { wmsPartNo: wmsSku } });
              results.push({ wmsId, wmsSku, wmsName: wmsDesc, status: 'linked', localProductId: local.id, localSku: local.sku });
            } else {
              results.push({ wmsId, wmsSku, wmsName: wmsDesc, status: 'matched', localProductId: local.id, localSku: local.sku });
            }
          } else {
            results.push({ wmsId, wmsSku, wmsName: wmsDesc, status: 'matched', localProductId: local.id, localSku: local.sku });
          }
        } else {
          // No match — create or preview
          const brand = detectBrand(wmsDesc);
          const category = detectCategory(wmsSku);

          if (mode === 'confirm') {
            const created = await prisma.product.create({
              data: {
                sku: wmsSku,
                wmsPartNo: wmsSku,
                brand: brand as 'MAXNUM',
                name: wmsDesc || wmsSku,
                category,
                uom: part.UOM || 'EA',
                partType: part.PartTypeName || null,
                price: 0,
                warrantyMonths: 24,
                pmIntervalMonths: 3,
              },
            });
            results.push({ wmsId, wmsSku, wmsName: wmsDesc, status: 'created', localProductId: created.id, detectedBrand: brand, detectedCategory: category });
          } else {
            results.push({ wmsId, wmsSku, wmsName: wmsDesc, status: 'to_create', detectedBrand: brand, detectedCategory: category });
          }
        }
      }

      const summary = {
        totalWms: wmsParts.length,
        filtered: filtered.length,
        matched: results.filter(r => r.status === 'matched').length,
        linked: results.filter(r => r.status === 'linked').length,
        toCreate: results.filter(r => r.status === 'to_create').length,
        created: results.filter(r => r.status === 'created').length,
      };

      return { ok: true, data: { mode, summary, results } };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  // ════════════════════════════════════════════════════════
  // Phase 2 — Stock flow
  // ════════════════════════════════════════════════════════

  /** GET /wms/stock/:sku — query stock from WMS (or mock) */
  app.get<{ Params: { sku: string } }>('/stock/:sku', async (req) => {
    const stock = await logSync('stock', 'pull', { sku: req.params.sku }, () =>
      adapters.wms.getStock(req.params.sku),
    );
    return { ok: true, data: stock };
  });

  /** GET /wms/stock-all — bulk stock for all SKUs */
  app.get('/stock-all', async (_req, reply) => {
    try {
      if (adapters.wms.mode !== 'live') return { ok: true, data: [] };
      const data = await live().getAllStock();
      return { ok: true, data };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/receipts-waiting — goods receipts pending scan */
  app.get('/receipts-waiting', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      return { ok: true, data: await live().getReceiptsWaiting() };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/receipt-detail?number=xxx&type=GR */
  app.get('/receipt-detail', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { number: no, type: t } = req.query as { number?: string; type?: string };
    if (!no) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'number required' } });
    try {
      return { ok: true, data: await live().getReceiptDetail(no, t ?? 'GR') };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/containers-waiting-scan-in */
  app.get('/containers-waiting-scan-in', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      return { ok: true, data: await live().getContainersWaitingForScanIn() };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/scan-in-locations?containerName=xxx */
  app.get('/scan-in-locations', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { containerName } = req.query as { containerName?: string };
    if (!containerName) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'containerName required' } });
    try {
      return { ok: true, data: await live().getScanInLocations(containerName) };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** POST /wms/scan-in */
  const scanInSchema = z.object({ containerName: z.string().min(1), locationName: z.string().min(1) });
  app.post('/scan-in', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = scanInSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    try {
      const result = await logSync('scan_in', 'push', parsed.data, () =>
        live().scanIn(parsed.data.containerName, parsed.data.locationName, req.authUser!.id),
      );
      return { ok: true, data: result };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/pending-scan-out */
  app.get('/pending-scan-out', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      return { ok: true, data: await live().getPendingScanOutOrders() };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** POST /wms/scan-out */
  const scanOutSchema = z.object({ orderName: z.string().min(1), containerName: z.string().min(1) });
  app.post('/scan-out', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = scanOutSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    try {
      const result = await logSync('scan_out', 'push', parsed.data, () =>
        live().scanOut(parsed.data.orderName, parsed.data.containerName, req.authUser!.id),
      );
      return { ok: true, data: result };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/order-state?name=xxx */
  app.get('/order-state', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { name } = req.query as { name?: string };
    if (!name) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'name required' } });
    try {
      return { ok: true, data: await live().getOrderState(name) };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** POST /wms/close-order */
  const closeSchema = z.object({ orderId: z.number().int() });
  app.post('/close-order', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = closeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'orderId required' } });
    try {
      const result = await logSync('order_close', 'push', parsed.data, () =>
        live().closeOrder(parsed.data.orderId, req.authUser!.id),
      );
      return { ok: true, data: result };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  // ════════════════════════════════════════════════════════
  // Phase 3 — Container + Delivery + Inventory Count
  // ════════════════════════════════════════════════════════

  /** GET /wms/container?name=xxx or ?sn=xxx */
  app.get('/container', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { name, sn } = req.query as { name?: string; sn?: string };
    if (!name && !sn) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'name or sn required' } });
    try {
      const data = name ? await live().getContainerInfo(name) : await live().getContainerBySn(sn!);
      return { ok: true, data };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/picked-containers?pickingName=xxx */
  app.get('/picked-containers', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { pickingName } = req.query as { pickingName?: string };
    if (!pickingName) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'pickingName required' } });
    try {
      return { ok: true, data: await live().getPickedContainers(pickingName) };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/truckloads-queue */
  app.get('/truckloads-queue', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      return { ok: true, data: await live().getTruckloadsOnQueue() };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/invoice-state?number=xxx */
  app.get('/invoice-state', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const { number: no } = req.query as { number?: string };
    if (!no) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'number required' } });
    try {
      return { ok: true, data: await live().getInvoiceState(no) };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** GET /wms/inventory-count-profiles */
  app.get('/inventory-count-profiles', { preHandler: [app.requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      return { ok: true, data: await live().getInventoryCountProfiles() };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  /** POST /wms/inventory-count */
  const countSchema = z.object({
    profileId: z.number().int(),
    containerName: z.string().min(1),
    locationName: z.string().min(1),
    qty: z.number().int().min(0),
    remark: z.string().optional(),
  });
  app.post('/inventory-count', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = countSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    try {
      const result = await logSync('inventory_count', 'push', parsed.data, () =>
        live().submitInventoryCount({ ...parsed.data, userId: req.authUser!.id }),
      );
      return { ok: true, data: result };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: { code: 'WMS_ERROR', message: String(err) } });
    }
  });

  // ─── Existing: sync logs + stock cache ─────────────────

  app.get('/sync-logs', async (req, reply) => {
    const parsed = wmsSyncLogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid query' } });
    }
    const q = parsed.data;
    const where: Record<string, unknown> = {};
    if (q.entity) where.entity = q.entity;
    if (q.status) where.status = q.status;
    const [items, total] = await Promise.all([
      prisma.wmsSyncLog.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wmsSyncLog.count({ where }),
    ]);
    return {
      ok: true,
      data: { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
    };
  });

  app.get('/stock-cache', async () => {
    const items = await prisma.wmsStockCache.findMany({
      orderBy: [{ sku: 'asc' }, { warehouse: 'asc' }],
    });
    return { ok: true, data: items };
  });
};

export default wmsRoutes;
