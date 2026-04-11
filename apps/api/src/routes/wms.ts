import type { FastifyPluginAsync } from 'fastify';
import { wmsSyncLogListQuerySchema } from '@oms/shared';
import { prisma } from '../lib/prisma';
import { wms, logSync } from '../lib/wms';

const wmsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /wms/status ─── adapter info (mock vs live)
  app.get('/status', async () => ({
    ok: true,
    data: { mode: wms.mode, connected: wms.mode === 'mock' ? 'simulated' : 'unknown' },
  }));

  // ─── GET /wms/stock/:sku ─── check stock for a SKU (logs the call)
  app.get<{ Params: { sku: string } }>('/stock/:sku', async (req) => {
    const stock = await logSync('stock', 'pull', { sku: req.params.sku }, () =>
      wms.getStock(req.params.sku),
    );
    return { ok: true, data: stock };
  });

  // ─── GET /wms/sync-logs ─── list of all sync operations
  app.get('/sync-logs', async (req, reply) => {
    const parsed = wmsSyncLogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
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
      data: {
        items,
        total,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  });

  // ─── GET /wms/stock-cache ─── current cache snapshot
  app.get('/stock-cache', async () => {
    const items = await prisma.wmsStockCache.findMany({
      orderBy: [{ sku: 'asc' }, { warehouse: 'asc' }],
    });
    return { ok: true, data: items };
  });
};

export default wmsRoutes;
