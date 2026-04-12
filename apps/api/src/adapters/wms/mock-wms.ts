import { prisma } from '../../lib/prisma';
import type { WmsOrderPush, WmsStock } from '@oms/shared';
import type { WmsAdapter } from '../types';

export class MockWmsAdapter implements WmsAdapter {
  readonly mode = 'mock' as const;

  async getStock(sku: string): Promise<WmsStock[]> {
    const cached = await prisma.wmsStockCache.findMany({ where: { sku } });
    if (cached.length > 0) {
      return cached.map((c) => ({
        sku: c.sku,
        warehouse: c.warehouse,
        qty: c.qty,
        updatedAt: c.updatedAt.toISOString(),
      }));
    }
    const hash = [...sku].reduce((a, c) => a + c.charCodeAt(0), 0);
    const bkk = { sku, warehouse: 'BKK-01', qty: (hash % 20) + 5, updatedAt: new Date() };
    const cnx = { sku, warehouse: 'CNX-01', qty: (hash % 10) + 2, updatedAt: new Date() };

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

  async pushOrder(_payload: WmsOrderPush): Promise<{ wmsOrderId: string }> {
    await new Promise((r) => setTimeout(r, 50));
    return { wmsOrderId: `WMS-MOCK-${Date.now().toString(36).toUpperCase()}` };
  }
}
