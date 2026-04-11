import type { FastifyPluginAsync } from 'fastify';
import { pmListQuerySchema, completePmSchema } from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const pmRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /pm-schedules ───
  app.get('/', async (req, reply) => {
    const parsed = pmListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.techId) where.techId = q.techId;
    if (q.upcoming) {
      // Upcoming = PENDING or SCHEDULED, due within 30 days
      where.status = { in: ['PENDING', 'SCHEDULED'] };
      where.scheduledAt = {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    const [items, total] = await Promise.all([
      prisma.pmSchedule.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { scheduledAt: 'asc' },
        include: {
          asset: {
            include: {
              product: { select: { id: true, name: true, brand: true, sku: true, pmIntervalMonths: true } },
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          tech: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.pmSchedule.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── POST /pm-schedules/:id/assign ─── (SERVICE + ADMIN)
  app.post<{ Params: { id: string } }>(
    '/:id/assign',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] },
    async (req, reply) => {
      const body = (req.body ?? {}) as { techId?: string };
      if (!body.techId) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'techId required' },
        });
      }
      try {
        const pm = await prisma.pmSchedule.update({
          where: { id: req.params.id },
          data: { techId: body.techId, status: 'SCHEDULED' },
        });
        return { ok: true, data: pm };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'PM schedule not found' } });
      }
    },
  );

  // ─── POST /pm-schedules/:id/complete ───
  // Marks current PM done, generates next PM based on product interval
  app.post<{ Params: { id: string } }>(
    '/:id/complete',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] },
    async (req, reply) => {
      const parsed = completePmSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input' },
        });
      }

      const pm = await prisma.pmSchedule.findUnique({
        where: { id: req.params.id },
        include: { asset: { include: { product: true } } },
      });
      if (!pm) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'PM schedule not found' } });
      }
      if (pm.status === 'COMPLETED') {
        return reply.code(409).send({
          ok: false,
          error: { code: 'ALREADY_COMPLETED', message: 'PM already completed' },
        });
      }

      const now = new Date();
      const interval = pm.asset.product.pmIntervalMonths;
      const nextDate = new Date(now.getTime() + interval * 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.pmSchedule.update({
          where: { id: pm.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            note: parsed.data.note ?? undefined,
          },
        }),
        prisma.pmSchedule.create({
          data: {
            assetId: pm.assetId,
            scheduledAt: nextDate,
            status: 'PENDING',
          },
        }),
        prisma.asset.update({
          where: { id: pm.assetId },
          data: { nextPmDate: nextDate },
        }),
      ]);

      return { ok: true, data: { completedAt: now, nextPmDate: nextDate } };
    },
  );
};

export default pmRoutes;
