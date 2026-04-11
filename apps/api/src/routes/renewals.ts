import type { FastifyPluginAsync } from 'fastify';
import {
  createRenewalOfferSchema,
  updateRenewalStatusSchema,
  renewalListQuerySchema,
  suggestRenewalPrice,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const renewalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /renewals ───
  app.get('/', async (req, reply) => {
    const parsed = renewalListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.assetId) where.assetId = q.assetId;

    const [items, total] = await Promise.all([
      prisma.warrantyRenewal.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          asset: {
            include: {
              product: { select: { id: true, name: true, brand: true, sku: true } },
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      }),
      prisma.warrantyRenewal.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /renewals/candidates ─── assets with warranty expiring in next 90 days
  //     but no active (OFFERED/ACCEPTED/PAID) renewal yet
  app.get('/candidates', async () => {
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.asset.findMany({
      where: {
        warrantyEnd: { gte: now, lte: in90 },
        renewals: {
          none: {
            status: { in: ['OFFERED', 'ACCEPTED', 'PAID'] },
          },
        },
      },
      include: {
        product: { select: { id: true, name: true, brand: true, sku: true, price: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { warrantyEnd: 'asc' },
    });

    // Enrich with suggested price
    const enriched = candidates.map((a) => ({
      ...a,
      daysLeft: Math.ceil((a.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      suggestedPrice: {
        standard12: suggestRenewalPrice(Number(a.product.price), 'STANDARD', 12),
        premium12: suggestRenewalPrice(Number(a.product.price), 'PREMIUM', 12),
      },
    }));

    return { ok: true, data: enriched };
  });

  // ─── POST /renewals ─── create an offer (SALES + ADMIN)
  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = createRenewalOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
    if (!asset) {
      return reply.code(404).send({ ok: false, error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } });
    }

    // Calculate new warranty end date based on extendMonths (starts from current warrantyEnd)
    const baseDate = asset.warrantyEnd > new Date() ? asset.warrantyEnd : new Date();
    const newEndDate = new Date(
      baseDate.getTime() + parsed.data.extendMonths * 30 * 24 * 60 * 60 * 1000,
    );

    const renewal = await prisma.warrantyRenewal.create({
      data: {
        assetId: parsed.data.assetId,
        type: parsed.data.type,
        price: parsed.data.price,
        status: 'OFFERED',
        newEndDate,
      },
      include: {
        asset: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });
    return reply.code(201).send({ ok: true, data: renewal });
  });

  // ─── POST /renewals/:id/status ─── change status (SALES + ADMIN)
  //     When status → PAID, also extend asset.warrantyEnd atomically
  app.post<{ Params: { id: string } }>(
    '/:id/status',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateRenewalStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }

      const renewal = await prisma.warrantyRenewal.findUnique({
        where: { id: req.params.id },
      });
      if (!renewal) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Renewal not found' } });
      }

      // When marking PAID, atomically:
      //   1) mark renewal PAID with paidAt
      //   2) extend asset.warrantyEnd to the new date
      if (parsed.data.status === 'PAID') {
        if (!renewal.newEndDate) {
          return reply.code(400).send({
            ok: false,
            error: { code: 'NO_END_DATE', message: 'Renewal has no newEndDate set' },
          });
        }
        const [updated] = await prisma.$transaction([
          prisma.warrantyRenewal.update({
            where: { id: renewal.id },
            data: { status: 'PAID', paidAt: new Date() },
          }),
          prisma.asset.update({
            where: { id: renewal.assetId },
            data: { warrantyEnd: renewal.newEndDate },
          }),
        ]);
        return { ok: true, data: updated };
      }

      const updated = await prisma.warrantyRenewal.update({
        where: { id: renewal.id },
        data: { status: parsed.data.status },
      });
      return { ok: true, data: updated };
    },
  );
};

export default renewalRoutes;
