import type { FastifyPluginAsync } from 'fastify';
import { assetListQuerySchema, warrantyStatus } from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const assetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /assets ───
  app.get('/', async (req, reply) => {
    const parsed = assetListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.customerId) where.customerId = q.customerId;
    if (q.search) {
      where.OR = [
        { serialNo: { contains: q.search, mode: 'insensitive' } },
        { product: { name: { contains: q.search, mode: 'insensitive' } } },
        { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const now = new Date();
    // warrantyStatus filter is computed in app code — handle after fetch
    if (q.warrantyStatus === 'expired') {
      where.warrantyEnd = { lt: now };
    } else if (q.warrantyStatus === 'expiring') {
      where.warrantyEnd = {
        gte: now,
        lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      };
    } else if (q.warrantyStatus === 'active') {
      where.warrantyEnd = { gt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) };
    }

    const [rawItems, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { installedAt: q.order },
        include: {
          product: { select: { id: true, name: true, brand: true, sku: true, warrantyMonths: true, pmIntervalMonths: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { tickets: true, pmSchedules: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    // Enrich with computed warranty status + days remaining
    const items = rawItems.map((a) => ({
      ...a,
      warrantyStatus: warrantyStatus(a.warrantyEnd, now),
      warrantyDaysLeft: Math.ceil((a.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }));

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /assets/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        customer: true,
        so: { select: { id: true, soNo: true } },
        pmSchedules: { orderBy: { scheduledAt: 'desc' } },
        tickets: { orderBy: { createdAt: 'desc' } },
        renewals: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!asset) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }
    const now = new Date();
    return {
      ok: true,
      data: {
        ...asset,
        warrantyStatus: warrantyStatus(asset.warrantyEnd, now),
        warrantyDaysLeft: Math.ceil(
          (asset.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      },
    };
  });
};

export default assetRoutes;
