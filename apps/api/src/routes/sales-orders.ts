import type { FastifyPluginAsync } from 'fastify';
import {
  createSalesOrderFromQuoteSchema,
  updateSalesOrderStatusSchema,
  salesOrderListQuerySchema,
  markPaidSchema,
  buildMilestones,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';
import { nextSalesOrderNo } from '../lib/doc-no';

const salesOrderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /sales-orders ───
  app.get('/', async (req, reply) => {
    const parsed = salesOrderListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.customerId) where.customerId = q.customerId;
    if (q.search) {
      where.OR = [
        { soNo: { contains: q.search, mode: 'insensitive' } },
        { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true, milestones: true } },
          milestones: { select: { status: true } },
        },
      }),
      prisma.salesOrder.count({ where }),
    ]);

    // Derive payment progress summary
    const enriched = items.map((so) => {
      const paidCount = so.milestones.filter((m) => m.status === 'PAID').length;
      const totalMilestones = so.milestones.length;
      return {
        ...so,
        milestones: undefined,
        paymentProgress: totalMilestones > 0 ? `${paidCount}/${totalMilestones}` : '–',
      };
    });

    return { ok: true, data: paginate(enriched, total, q) };
  });

  // ─── GET /sales-orders/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const so = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        quotation: { select: { id: true, quoteNo: true, status: true } },
        items: { include: { product: true }, orderBy: { id: 'asc' } },
        milestones: { orderBy: { seq: 'asc' } },
        installation: true,
      },
    });
    if (!so) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Sales order not found' } });
    }
    return { ok: true, data: so };
  });

  // ─── POST /sales-orders/from-quote ─── (SALES + ADMIN)
  app.post(
    '/from-quote',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = createSalesOrderFromQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }

      const quote = await prisma.quotation.findUnique({
        where: { id: parsed.data.quotationId },
        include: { items: true, order: true },
      });
      if (!quote) {
        return reply.code(404).send({ ok: false, error: { code: 'QUOTE_NOT_FOUND', message: 'Quotation not found' } });
      }
      if (quote.order) {
        return reply.code(409).send({
          ok: false,
          error: { code: 'ALREADY_CONVERTED', message: `Already converted to SO ${quote.order.soNo}` },
        });
      }
      if (quote.status !== 'ACCEPTED') {
        return reply.code(409).send({
          ok: false,
          error: {
            code: 'QUOTE_NOT_ACCEPTED',
            message: `Quote must be in ACCEPTED status (currently ${quote.status})`,
          },
        });
      }

      const soNo = await nextSalesOrderNo();
      const totalNum = Number(quote.total);
      const milestones = buildMilestones(totalNum, parsed.data.milestoneTemplate);

      const so = await prisma.salesOrder.create({
        data: {
          soNo,
          quotationId: quote.id,
          customerId: quote.customerId,
          total: quote.total,
          status: 'PENDING',
          items: {
            create: quote.items.map((it) => ({
              productId: it.productId,
              qty: it.qty,
              unitPrice: it.unitPrice,
            })),
          },
          milestones: {
            create: milestones.map((m) => ({
              seq: m.seq,
              label: m.label,
              amount: m.amount,
              dueDate: m.dueDate,
              status: 'PENDING' as const,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          milestones: { orderBy: { seq: 'asc' } },
          customer: { select: { id: true, name: true } },
        },
      });
      return reply.code(201).send({ ok: true, data: so });
    },
  );

  // ─── POST /sales-orders/:id/status ───
  app.post<{ Params: { id: string } }>(
    '/:id/status',
    { preHandler: [app.requireRole('SALES', 'ADMIN', 'INSTALL')] },
    async (req, reply) => {
      const parsed = updateSalesOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const so = await prisma.salesOrder.update({
          where: { id: req.params.id },
          data: { status: parsed.data.status },
        });
        return { ok: true, data: so };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Sales order not found' } });
      }
    },
  );

  // ─── Milestones ───
  app.post<{ Params: { id: string } }>(
    '/milestones/:id/mark-paid',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = markPaidSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const milestone = await prisma.paymentMilestone.update({
          where: { id: req.params.id },
          data: {
            paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
            status: 'PAID',
          },
        });
        return { ok: true, data: milestone };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });
      }
    },
  );
};

export default salesOrderRoutes;
