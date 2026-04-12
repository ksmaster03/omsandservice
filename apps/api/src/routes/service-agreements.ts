import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const;

const serviceAgreementRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const q = req.query as { status?: string; customerId?: string };
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.customerId) where.customerId = q.customerId;
    const items = await prisma.serviceAgreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, name: true } } },
    });
    return { ok: true, data: items };
  });

  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const schema = z.object({
      customerId: z.string().uuid(),
      type: z.string().max(50).default('PM_PACKAGE'),
      coverage: z.string().max(500).optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      price: z.number().positive(),
      autoRenew: z.boolean().optional(),
      note: z.string().max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });

    const count = await prisma.serviceAgreement.count();
    const agreementNo = `SA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    const sa = await prisma.serviceAgreement.create({
      data: {
        agreementNo,
        customerId: parsed.data.customerId,
        type: parsed.data.type,
        coverage: parsed.data.coverage,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        price: parsed.data.price,
        autoRenew: parsed.data.autoRenew ?? false,
        note: parsed.data.note,
        status: 'DRAFT',
      },
    });
    return reply.code(201).send({ ok: true, data: sa });
  });

  app.patch<{ Params: { id: string } }>('/:id/status', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const schema = z.object({ status: z.enum(STATUSES) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid status' } });
    const sa = await prisma.serviceAgreement.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });
    return { ok: true, data: sa };
  });
};

export default serviceAgreementRoutes;
