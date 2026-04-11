import type { FastifyPluginAsync } from 'fastify';
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
  quotationListQuerySchema,
  computeQuotationTotals,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';
import { nextQuoteNo } from '../lib/doc-no';
import { renderQuotePdf } from '../lib/pdf';

const quotationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /quotations ───
  app.get('/', async (req, reply) => {
    const parsed = quotationListQuerySchema.safeParse(req.query);
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
        { quoteNo: { contains: q.search, mode: 'insensitive' } },
        { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          customer: { select: { id: true, name: true } },
          sales: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /quotations/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const quote = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        sales: { select: { id: true, name: true, email: true } },
        items: { include: { product: true }, orderBy: { id: 'asc' } },
        order: { select: { id: true, soNo: true, status: true } },
      },
    });
    if (!quote) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }
    return { ok: true, data: quote };
  });

  // ─── POST /quotations ─── (SALES + ADMIN)
  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = createQuotationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const input = parsed.data;

    // Verify customer + products exist
    const [customer, products] = await Promise.all([
      prisma.customer.findUnique({ where: { id: input.customerId } }),
      prisma.product.findMany({
        where: { id: { in: input.items.map((i) => i.productId) } },
      }),
    ]);
    if (!customer) {
      return reply.code(400).send({ ok: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer does not exist' } });
    }
    const foundProductIds = new Set(products.map((p) => p.id));
    const missing = input.items.find((i) => !foundProductIds.has(i.productId));
    if (missing) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${missing.productId} does not exist` },
      });
    }

    const totals = computeQuotationTotals(input.items, input.discount, input.vatRate);
    const validUntil = new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000);
    const quoteNo = await nextQuoteNo();

    const quote = await prisma.quotation.create({
      data: {
        quoteNo,
        customerId: input.customerId,
        leadId: input.leadId ?? null,
        salesId: req.authUser!.id,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vat: totals.vat,
        total: totals.total,
        validUntil,
        status: 'DRAFT',
        items: {
          create: input.items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discount: it.discount,
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    return reply.code(201).send({ ok: true, data: quote });
  });

  // ─── POST /quotations/:id/status ─── (change status, SALES + ADMIN)
  app.post<{ Params: { id: string } }>(
    '/:id/status',
    { preHandler: [app.requireRole('SALES', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateQuotationStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const quote = await prisma.quotation.update({
          where: { id: req.params.id },
          data: { status: parsed.data.status },
        });
        return { ok: true, data: quote };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
      }
    },
  );

  // ─── GET /quotations/:id/pdf ─── stream quotation PDF
  app.get<{ Params: { id: string } }>('/:id/pdf', async (req, reply) => {
    const quote = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        sales: { select: { name: true, email: true } },
        items: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });
    if (!quote) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }

    // Back-compute vat rate from stored values so the template matches what was saved.
    // subtotal − discount = base; vat = base * rate → rate = vat / base
    const subtotal = Number(quote.subtotal);
    const discount = Number(quote.discount);
    const vat = Number(quote.vat);
    const base = Math.max(0, subtotal - discount);
    const vatRate = base > 0 ? Math.round((vat / base) * 100 * 10) / 10 : 0;

    const pdfBuffer = await renderQuotePdf({
      quoteNo: quote.quoteNo,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      status: quote.status,
      customer: {
        name: quote.customer.name,
        taxId: quote.customer.taxId,
        address: quote.customer.address,
        contactName: quote.customer.contactName,
        phone: quote.customer.phone,
        email: quote.customer.email,
      },
      sales: { name: quote.sales.name, email: quote.sales.email },
      items: quote.items.map((it) => {
        const unitPrice = Number(it.unitPrice);
        const itemDiscount = Number(it.discount);
        return {
          name: it.product.name,
          sku: it.product.sku,
          qty: it.qty,
          unitPrice,
          discount: itemDiscount,
          lineTotal: it.qty * unitPrice - itemDiscount,
        };
      }),
      subtotal,
      discount,
      vatRate,
      vat,
      total: Number(quote.total),
    });

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${quote.quoteNo}.pdf"`)
      .header('Content-Length', pdfBuffer.length.toString());
    return reply.send(pdfBuffer);
  });
};

export default quotationRoutes;
