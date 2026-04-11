/**
 * Sprint 2 — full sales flow integration test:
 *   Lead → Quote (with items) → Accept → Sales Order (with milestones) → Mark paid
 *
 * Uses the seeded sample customer + products, runs against the real DB.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';
import { computeQuotationTotals, buildMilestones } from '@oms/shared';

const SAMPLE_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';

let app: FastifyInstance;
let salesToken: string;
let adminToken: string;
let serviceToken: string;
let product1Id: string;
let product2Id: string;

// Track entities created so we can clean up
const createdLeadIds: string[] = [];
const createdQuoteIds: string[] = [];
const createdSOIds: string[] = [];

beforeAll(async () => {
  app = await makeTestApp();
  salesToken = await loginAs(app, 'sales1@nbasport.local');
  adminToken = await loginAs(app, 'admin@nbasport.local');
  serviceToken = await loginAs(app, 'service1@nbasport.local');

  const p1 = await prisma.product.findUnique({ where: { sku: 'MX-T9-PRO' } });
  const p2 = await prisma.product.findUnique({ where: { sku: 'AF-X3' } });
  if (!p1 || !p2) throw new Error('Seed products missing — run pnpm db:seed');
  product1Id = p1.id;
  product2Id = p2.id;
});

afterAll(async () => {
  // Cleanup in FK-safe order
  if (createdSOIds.length) {
    await prisma.paymentMilestone.deleteMany({ where: { soId: { in: createdSOIds } } });
    await prisma.sOItem.deleteMany({ where: { soId: { in: createdSOIds } } });
    await prisma.salesOrder.deleteMany({ where: { id: { in: createdSOIds } } });
  }
  if (createdQuoteIds.length) {
    await prisma.quotationItem.deleteMany({ where: { quotationId: { in: createdQuoteIds } } });
    await prisma.quotation.deleteMany({ where: { id: { in: createdQuoteIds } } });
  }
  if (createdLeadIds.length) {
    await prisma.demo.deleteMany({ where: { leadId: { in: createdLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: createdLeadIds } } });
  }
  await app.close();
  await prisma.$disconnect();
});

describe('Sprint 2 — Lead + Demo', () => {
  it('SALES can create a lead', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/leads',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        value: 150000,
        stage: 'LEAD',
        note: 'Interested in full gym setup',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.customer.name).toContain('The Fitness BKK');
    expect(Number(body.data.value)).toBe(150000);
    createdLeadIds.push(body.data.id);
  });

  it('SERVICE role cannot create lead', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/leads',
      headers: authHeader(serviceToken),
      payload: { customerId: SAMPLE_CUSTOMER_ID, value: 100 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('can update lead stage', async () => {
    const leadId = createdLeadIds[0]!;
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/leads/${leadId}/stage`,
      headers: authHeader(salesToken),
      payload: { stage: 'QUALIFIED', note: 'Budget confirmed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.stage).toBe('QUALIFIED');
  });

  it('pipeline endpoint groups by stage', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/leads/pipeline',
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveProperty('QUALIFIED');
    expect(body.data).toHaveProperty('LEAD');
    expect(body.data).toHaveProperty('QUOTE');
  });

  it('can schedule a demo linked to the lead', async () => {
    const leadId = createdLeadIds[0]!;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/leads/demos',
      headers: authHeader(salesToken),
      payload: {
        leadId,
        productId: product1Id,
        scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        note: 'Customer site demo',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.status).toBe('SCHEDULED');
  });
});

describe('Sprint 2 — Quotation', () => {
  it('SALES can create a quotation with items', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        items: [
          { productId: product1Id, qty: 2, unitPrice: 89000, discount: 5000 },
          { productId: product2Id, qty: 3, unitPrice: 42000, discount: 0 },
        ],
        discount: 10000,
        vatRate: 7,
        validDays: 30,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.quoteNo).toMatch(/^Q-\d{6}-\d{4}$/);
    expect(body.data.status).toBe('DRAFT');
    expect(body.data.items).toHaveLength(2);

    // Verify totals via shared helper (source of truth)
    const expected = computeQuotationTotals(
      [
        { productId: product1Id, qty: 2, unitPrice: 89000, discount: 5000 },
        { productId: product2Id, qty: 3, unitPrice: 42000, discount: 0 },
      ],
      10000,
      7,
    );
    expect(Number(body.data.subtotal)).toBeCloseTo(expected.subtotal, 2);
    expect(Number(body.data.total)).toBeCloseTo(expected.total, 2);

    createdQuoteIds.push(body.data.id);
  });

  it('rejects quote with unknown product', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        items: [
          { productId: '00000000-0000-0000-0000-999999999999', qty: 1, unitPrice: 100 },
        ],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects quote with empty items', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: { customerId: SAMPLE_CUSTOMER_ID, items: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('can transition status DRAFT → SENT → ACCEPTED', async () => {
    const id = createdQuoteIds[0]!;
    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/quotations/${id}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'SENT' },
    });
    expect(sent.statusCode).toBe(200);

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/quotations/${id}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'ACCEPTED' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().data.status).toBe('ACCEPTED');
  });

  it('list includes the new quote with customer join', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/quotations?pageSize=50',
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const found = body.data.items.find((q: { id: string }) => q.id === createdQuoteIds[0]);
    expect(found).toBeDefined();
    expect(found.customer.name).toContain('The Fitness BKK');
  });
});

describe('Sprint 2 — Sales Order from Quote + milestones', () => {
  it('rejects SO creation when quote not accepted', async () => {
    // Create a fresh draft quote
    const draft = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        items: [{ productId: product1Id, qty: 1, unitPrice: 89000 }],
      },
    });
    const draftId = draft.json().data.id as string;
    createdQuoteIds.push(draftId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/sales-orders/from-quote',
      headers: authHeader(salesToken),
      payload: { quotationId: draftId },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('QUOTE_NOT_ACCEPTED');
  });

  it('creates SO from accepted quote with 30/30/40 milestones', async () => {
    const quoteId = createdQuoteIds[0]!; // already ACCEPTED from prior test
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/sales-orders/from-quote',
      headers: authHeader(salesToken),
      payload: { quotationId: quoteId, milestoneTemplate: '30_30_40' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.soNo).toMatch(/^SO-\d{6}-\d{4}$/);
    expect(body.data.milestones).toHaveLength(3);
    expect(body.data.milestones[0].label).toContain('มัดจำ');

    const totalAmt = body.data.milestones.reduce(
      (sum: number, m: { amount: string }) => sum + Number(m.amount),
      0,
    );
    // Sum should match SO total (small rounding tolerance)
    expect(totalAmt).toBeCloseTo(Number(body.data.total), 1);

    createdSOIds.push(body.data.id);
  });

  it('rejects double-convert of same quote', async () => {
    const quoteId = createdQuoteIds[0]!;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/sales-orders/from-quote',
      headers: authHeader(salesToken),
      payload: { quotationId: quoteId },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ALREADY_CONVERTED');
  });

  it('can mark first milestone as paid', async () => {
    const so = await prisma.salesOrder.findUnique({
      where: { id: createdSOIds[0] },
      include: { milestones: { orderBy: { seq: 'asc' } } },
    });
    const milestoneId = so!.milestones[0]!.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/sales-orders/milestones/${milestoneId}/mark-paid`,
      headers: authHeader(salesToken),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('PAID');
  });

  it('SO list shows payment progress 1/3', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/sales-orders',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const found = res.json().data.items.find((so: { id: string }) => so.id === createdSOIds[0]);
    expect(found).toBeDefined();
    expect(found.paymentProgress).toBe('1/3');
  });

  it('ADMIN can change SO status to CONFIRMED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/sales-orders/${createdSOIds[0]}/status`,
      headers: authHeader(adminToken),
      payload: { status: 'CONFIRMED' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('CONFIRMED');
  });
});

describe('Sprint 2 — Shared helper parity', () => {
  it('buildMilestones 30/30/40 sums to total', () => {
    const total = 500000;
    const m = buildMilestones(total, '30_30_40');
    const sum = m.reduce((s, x) => s + x.amount, 0);
    expect(sum).toBeCloseTo(total, 1);
    expect(m).toHaveLength(3);
  });

  it('buildMilestones 50/50 sums to total', () => {
    const m = buildMilestones(1000, '50_50');
    expect(m).toHaveLength(2);
    expect(m[0]!.amount + m[1]!.amount).toBeCloseTo(1000, 2);
  });

  it('buildMilestones FULL returns single milestone', () => {
    const m = buildMilestones(1000, 'FULL');
    expect(m).toHaveLength(1);
    expect(m[0]!.amount).toBe(1000);
  });

  it('computeQuotationTotals correctly applies VAT', () => {
    const t = computeQuotationTotals(
      [{ productId: 'x', qty: 1, unitPrice: 100, discount: 0 }],
      0,
      7,
    );
    expect(t.subtotal).toBe(100);
    expect(t.vat).toBe(7);
    expect(t.total).toBe(107);
  });
});
