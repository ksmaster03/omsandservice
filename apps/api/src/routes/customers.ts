import type { FastifyPluginAsync } from 'fastify';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const customerRoutes: FastifyPluginAsync = async (app) => {
  // All customer routes require authenticated staff
  app.addHook('preHandler', app.authenticate);

  // ─── GET /customers ───
  app.get('/', async (req, reply) => {
    const parsed = customerListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.type) where.type = q.type;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { taxId: { contains: q.search } },
        { phone: { contains: q.search } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
      }),
      prisma.customer.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /customers/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        _count: { select: { orders: true, assets: true, tickets: true } },
      },
    });
    if (!customer) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }
    return { ok: true, data: customer };
  });

  // ─── POST /customers ─── (SALES + ADMIN)
  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const customer = await prisma.customer.create({ data: parsed.data });
    return reply.code(201).send({ ok: true, data: customer });
  });

  // ─── PATCH /customers/:id ─── (SALES + ADMIN)
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const customer = await prisma.customer.update({
          where: { id: req.params.id },
          data: parsed.data,
        });
        return { ok: true, data: customer };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }
    },
  );

  // ─── DELETE /customers/:id ─── (ADMIN only)
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.requireRole('ADMIN')] },
    async (req, reply) => {
      try {
        await prisma.customer.delete({ where: { id: req.params.id } });
        return { ok: true, data: { deleted: true } };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }
    },
  );
};

export default customerRoutes;
