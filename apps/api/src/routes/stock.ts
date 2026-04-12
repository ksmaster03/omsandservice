import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ensureStockItems } from '../lib/stock';

const adjustSchema = z.object({
  productId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().max(200).optional(),
});

const setStockSchema = z.object({
  productId: z.string().uuid(),
  onHand: z.number().int().min(0),
  reorderAt: z.number().int().min(0).optional(),
});

const stockRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /stock ─── list ALL products with stock levels (even if no StockItem yet)
  app.get('/', async () => {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { sku: 'asc' },
      select: { id: true, sku: true, name: true, brand: true, active: true },
    });
    const stockItems = await prisma.stockItem.findMany();
    const stockMap = new Map(stockItems.map((s) => [s.productId, s]));

    const enriched = products.map((p) => {
      const si = stockMap.get(p.id);
      const onHand = si?.onHand ?? 0;
      const reserved = si?.reserved ?? 0;
      const reorderAt = si?.reorderAt ?? 0;
      return {
        id: si?.id ?? `pending-${p.id}`,
        productId: p.id,
        product: p,
        onHand,
        reserved,
        available: Math.max(0, onHand - reserved),
        reorderAt,
        lowStock: onHand - reserved <= reorderAt,
        updatedAt: si?.updatedAt ?? null,
        hasStockItem: !!si,
      };
    });
    return { ok: true, data: enriched };
  });

  // ─── POST /stock/init-all ─── (ADMIN) create StockItem for all products that don't have one
  app.post('/init-all', { preHandler: [app.requireRole('ADMIN')] }, async () => {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true },
    });
    await prisma.$transaction(async (tx) => {
      await ensureStockItems(tx, products.map((p) => p.id));
    });
    return { ok: true, data: { initialized: products.length } };
  });

  // ─── POST /stock/set ─── (ADMIN) set absolute onHand value
  app.post('/set', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = setStockSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    await prisma.$transaction(async (tx) => {
      await ensureStockItems(tx, [parsed.data.productId]);
      await tx.stockItem.update({
        where: { productId: parsed.data.productId },
        data: {
          onHand: parsed.data.onHand,
          reorderAt: parsed.data.reorderAt ?? undefined,
        },
      });
    });
    return { ok: true, data: { updated: true } };
  });

  // ─── POST /stock/adjust ─── (ADMIN) delta-based adjustment
  app.post('/adjust', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { productId, delta } = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      await ensureStockItems(tx, [productId]);
      const item = await tx.stockItem.findUnique({ where: { productId } });
      const next = Math.max(0, item!.onHand + delta);
      return tx.stockItem.update({
        where: { productId },
        data: { onHand: next },
      });
    });
    return { ok: true, data: updated };
  });

  // ─── GET /stock/reservations ─── audit view of active reservations
  app.get('/reservations', async (req) => {
    const query = req.query as { soId?: string; status?: string };
    const where: Record<string, unknown> = {};
    if (query.soId) where.soId = query.soId;
    if (query.status) where.status = query.status;
    const rows = await prisma.stockReservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { ok: true, data: rows };
  });
};

export default stockRoutes;
