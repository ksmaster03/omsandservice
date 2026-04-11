import type { FastifyPluginAsync } from 'fastify';
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  leadListQuerySchema,
  createDemoSchema,
  updateDemoStatusSchema,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const leadRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /leads ───
  app.get('/', async (req, reply) => {
    const parsed = leadListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.stage) where.stage = q.stage;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.search) {
      where.customer = { name: { contains: q.search, mode: 'insensitive' } };
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { quotations: true, demos: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /leads/pipeline ─── (grouped by stage for board view)
  app.get('/pipeline', async (_req, _reply) => {
    const leads = await prisma.lead.findMany({
      where: { stage: { notIn: ['WON', 'LOST'] } },
      orderBy: { value: 'desc' },
      include: { customer: { select: { id: true, name: true } } },
    });
    const grouped: Record<string, typeof leads> = {
      LEAD: [],
      QUALIFIED: [],
      DEMO: [],
      QUOTE: [],
      NEGOTIATION: [],
    };
    for (const l of leads) {
      (grouped[l.stage] ??= []).push(l);
    }
    return { ok: true, data: grouped };
  });

  // ─── GET /leads/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        owner: { select: { id: true, name: true, email: true } },
        quotations: { orderBy: { createdAt: 'desc' } },
        demos: { include: { product: true }, orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!lead) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    }
    return { ok: true, data: lead };
  });

  // ─── POST /leads ─── (SALES + ADMIN)
  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const lead = await prisma.lead.create({
      data: {
        ...parsed.data,
        ownerId: req.authUser!.id,
        expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : null,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
    return reply.code(201).send({ ok: true, data: lead });
  });

  // ─── PATCH /leads/:id ─── (SALES + ADMIN)
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const data: Record<string, unknown> = { ...parsed.data };
        if (parsed.data.expectedClose) {
          data.expectedClose = new Date(parsed.data.expectedClose);
        }
        const lead = await prisma.lead.update({
          where: { id: req.params.id },
          data,
        });
        return { ok: true, data: lead };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
      }
    },
  );

  // ─── POST /leads/:id/stage ─── quick stage update
  app.post<{ Params: { id: string } }>(
    '/:id/stage',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateLeadStageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const lead = await prisma.lead.update({
          where: { id: req.params.id },
          data: {
            stage: parsed.data.stage,
            note: parsed.data.note ?? undefined,
          },
        });
        return { ok: true, data: lead };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
      }
    },
  );

  // ─── GET /leads/demos ─── list demos for calendar view (optional date range)
  app.get<{ Querystring: { from?: string; to?: string; status?: string } }>(
    '/demos',
    async (req, reply) => {
      const { from, to, status } = req.query;
      const where: Record<string, unknown> = {};
      if (from || to) {
        const range: Record<string, Date> = {};
        if (from) range.gte = new Date(from);
        if (to) range.lte = new Date(to);
        where.scheduledAt = range;
      }
      if (status) where.status = status;

      const demos = await prisma.demo.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        include: {
          product: { select: { id: true, name: true, brand: true, sku: true } },
          lead: {
            select: {
              id: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });
      return { ok: true, data: demos };
    },
  );

  // ─── Demo sub-routes ───
  app.post('/demos', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = createDemoSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const demo = await prisma.demo.create({
      data: {
        ...parsed.data,
        scheduledAt: new Date(parsed.data.scheduledAt),
      },
      include: { product: true },
    });
    return reply.code(201).send({ ok: true, data: demo });
  });

  app.patch<{ Params: { id: string } }>(
    '/demos/:id',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateDemoStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const demo = await prisma.demo.update({
          where: { id: req.params.id },
          data: { status: parsed.data.status, note: parsed.data.note ?? undefined },
        });
        return { ok: true, data: demo };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Demo not found' } });
      }
    },
  );
};

export default leadRoutes;
