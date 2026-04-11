/**
 * WMS adapter — abstraction over a warehouse management system.
 *
 * Sprint 4 ships a MOCK implementation that stores everything in our own
 * DB (WmsStockCache + WmsSyncLog) and uses deterministic fake stock values.
 * When the real WMS spec is available, swap the `WmsAdapter` implementation
 * — routes that call it never see the difference.
 *
 * The shared interface is the contract; consumers always await it and
 * handle { ok: boolean } so retries + dead-letter queue can slot in.
 */
import { prisma } from './prisma';
import type { WmsOrderPush, WmsStock } from '@oms/shared';
import { env } from '../config/env';

export interface WmsAdapter {
  mode: 'mock' | 'live';
  getStock(sku: string): Promise<WmsStock[]>;
  pushOrder(payload: WmsOrderPush): Promise<{ wmsOrderId: string }>;
}

/** Mock: deterministic fake stock based on SKU hash, writes to our cache table. */
class MockWmsAdapter implements WmsAdapter {
  readonly mode = 'mock' as const;

  async getStock(sku: string): Promise<WmsStock[]> {
    // Pull latest from cache (if any)
    const cached = await prisma.wmsStockCache.findMany({ where: { sku } });
    if (cached.length > 0) {
      return cached.map((c) => ({
        sku: c.sku,
        warehouse: c.warehouse,
        qty: c.qty,
        updatedAt: c.updatedAt.toISOString(),
      }));
    }
    // Simulate fetching from upstream: 2 warehouses with deterministic-ish qty
    const hash = [...sku].reduce((a, c) => a + c.charCodeAt(0), 0);
    const bkk = { sku, warehouse: 'BKK-01', qty: (hash % 20) + 5, updatedAt: new Date() };
    const cnx = { sku, warehouse: 'CNX-01', qty: (hash % 10) + 2, updatedAt: new Date() };

    // Persist to cache for next read
    await prisma.wmsStockCache.upsert({
      where: { sku_warehouse: { sku, warehouse: bkk.warehouse } },
      update: { qty: bkk.qty },
      create: { sku, warehouse: bkk.warehouse, qty: bkk.qty },
    });
    await prisma.wmsStockCache.upsert({
      where: { sku_warehouse: { sku, warehouse: cnx.warehouse } },
      update: { qty: cnx.qty },
      create: { sku, warehouse: cnx.warehouse, qty: cnx.qty },
    });

    return [
      { ...bkk, updatedAt: bkk.updatedAt.toISOString() },
      { ...cnx, updatedAt: cnx.updatedAt.toISOString() },
    ];
  }

  async pushOrder(payload: WmsOrderPush): Promise<{ wmsOrderId: string }> {
    // Simulate 50ms upstream latency
    await new Promise((r) => setTimeout(r, 50));
    // Fake WMS order id
    return { wmsOrderId: `WMS-MOCK-${Date.now().toString(36).toUpperCase()}` };
  }
}

/** Live adapter — stub for Sprint 4.5 when real WMS spec arrives. */
class LiveWmsAdapter implements WmsAdapter {
  readonly mode = 'live' as const;

  async getStock(_sku: string): Promise<WmsStock[]> {
    // TODO: call env.WMS_BASE_URL with env.WMS_API_KEY
    throw new Error('Live WMS adapter not implemented yet — real spec pending');
  }

  async pushOrder(_payload: WmsOrderPush): Promise<{ wmsOrderId: string }> {
    throw new Error('Live WMS adapter not implemented yet — real spec pending');
  }
}

export const wms: WmsAdapter =
  env.WMS_BASE_URL && env.WMS_API_KEY ? new LiveWmsAdapter() : new MockWmsAdapter();

/**
 * Wrap an adapter call with DB logging. Used by SO confirm flow so we
 * have an audit trail even when things go sideways (timeouts, mismatches).
 */
export async function logSync<T>(
  entity: string,
  action: 'push' | 'pull',
  request: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const log = await prisma.wmsSyncLog.create({
    data: {
      entity,
      action,
      requestJson: request as never,
      status: 'PENDING',
    },
  });
  try {
    const result = await fn();
    await prisma.wmsSyncLog.update({
      where: { id: log.id },
      data: {
        responseJson: result as never,
        status: 'SUCCESS',
      },
    });
    return result;
  } catch (err) {
    await prisma.wmsSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMsg: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
