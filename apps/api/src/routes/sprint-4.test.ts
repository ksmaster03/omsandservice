/**
 * Sprint 4 — warranty renewal, WMS adapter, reports, tech routes
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';
import { suggestRenewalPrice } from '@oms/shared';

const SAMPLE_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';

let app: FastifyInstance;
let salesToken: string;
let serviceToken: string;
let adminToken: string;

// Entities created for this test run — cleanup order matters
let productId: string;
let assetId: string;
let renewalId: string;
let soId: string;
let quoteId: string;

beforeAll(async () => {
  app = await makeTestApp();
  salesToken = await loginAs(app, 'sales1@nbasport.local');
  serviceToken = await loginAs(app, 'service1@nbasport.local');
  adminToken = await loginAs(app, 'admin@nbasport.local');

  const p = await prisma.product.findUnique({ where: { sku: 'MX-T9-PRO' } });
  if (!p) throw new Error('Seed product missing');
  productId = p.id;

  // Create a test asset directly for renewal tests (skip the full install flow)
  const so = await prisma.salesOrder.create({
    data: {
      soNo: `SO-TEST-${Date.now()}`,
      customerId: SAMPLE_CUSTOMER_ID,
      total: 89000,
      status: 'COMPLETED',
      items: {
        create: [{ productId, qty: 1, unitPrice: 89000 }],
      },
    },
  });
  soId = so.id;

  const asset = await prisma.asset.create({
    data: {
      serialNo: `TEST-SN-${Date.now()}`,
      productId,
      customerId: SAMPLE_CUSTOMER_ID,
      soId: so.id,
      installedAt: new Date('2024-06-01'),
      // Warranty ends in ~45 days — falls into "expiring" window
      warrantyEnd: new Date(Date.now() + 45 * 86400000),
    },
  });
  assetId = asset.id;
});

afterAll(async () => {
  if (renewalId) {
    await prisma.warrantyRenewal.delete({ where: { id: renewalId } }).catch(() => null);
  }
  if (assetId) {
    await prisma.pmSchedule.deleteMany({ where: { assetId } });
    await prisma.warrantyRenewal.deleteMany({ where: { assetId } });
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => null);
  }
  if (soId) {
    await prisma.sOItem.deleteMany({ where: { soId } });
    await prisma.salesOrder.delete({ where: { id: soId } }).catch(() => null);
  }
  if (quoteId) {
    await prisma.quotationItem.deleteMany({ where: { quotationId: quoteId } });
    await prisma.quotation.delete({ where: { id: quoteId } }).catch(() => null);
  }
  // Wipe any sync logs created during this test
  await prisma.wmsSyncLog.deleteMany({
    where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
  });
  await app.close();
  await prisma.$disconnect();
});

describe('Sprint 4 — Warranty renewal', () => {
  it('lists renewal candidates (assets expiring ≤90 days without active renewal)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/renewals/candidates',
      headers: authHeader(serviceToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const found = body.data.find((a: { id: string }) => a.id === assetId);
    expect(found).toBeDefined();
    expect(found.daysLeft).toBeGreaterThan(0);
    expect(found.daysLeft).toBeLessThanOrEqual(90);
    expect(found.suggestedPrice.standard12).toBeGreaterThan(0);
  });

  it('SALES creates renewal offer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/renewals',
      headers: authHeader(salesToken),
      payload: {
        assetId,
        type: 'STANDARD',
        price: 7120,
        extendMonths: 12,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.status).toBe('OFFERED');
    expect(body.data.newEndDate).toBeDefined();
    renewalId = body.data.id;
  });

  it('status → ACCEPTED keeps asset warrantyEnd unchanged', async () => {
    const before = await prisma.asset.findUnique({ where: { id: assetId } });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/renewals/${renewalId}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'ACCEPTED' },
    });
    expect(res.statusCode).toBe(200);
    const after = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(after!.warrantyEnd.getTime()).toBe(before!.warrantyEnd.getTime());
  });

  it('status → PAID extends asset.warrantyEnd atomically', async () => {
    const before = await prisma.asset.findUnique({ where: { id: assetId } });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/renewals/${renewalId}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'PAID' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('PAID');
    expect(res.json().data.paidAt).toBeTruthy();

    const after = await prisma.asset.findUnique({ where: { id: assetId } });
    // Should now be 12 months past the old warrantyEnd (+/- a few days for month math)
    const diff = after!.warrantyEnd.getTime() - before!.warrantyEnd.getTime();
    const diffDays = diff / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThanOrEqual(350);
    expect(diffDays).toBeLessThanOrEqual(370);
  });

  it('suggestRenewalPrice: standard 12mo is 8% of price', () => {
    expect(suggestRenewalPrice(89000, 'STANDARD', 12)).toBe(7100); // 8% → 7120 rounded to 7100
    expect(suggestRenewalPrice(89000, 'PREMIUM', 12)).toBe(13400); // 15% → 13350 rounded up
    expect(suggestRenewalPrice(100000, 'STANDARD', 6)).toBe(4000); // half year = half price
  });
});

describe('Sprint 4 — WMS mock adapter', () => {
  it('GET /wms/status reports mode=mock', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/wms/status',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.mode).toBe('mock');
  });

  it('GET /wms/stock/:sku returns 2 warehouse rows + writes cache + creates sync log', async () => {
    const logsBefore = await prisma.wmsSyncLog.count();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/wms/stock/MX-T9-PRO',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data[0].sku).toBe('MX-T9-PRO');

    const logsAfter = await prisma.wmsSyncLog.count();
    expect(logsAfter).toBe(logsBefore + 1);
  });

  it('GET /wms/sync-logs filters by status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/wms/sync-logs?status=SUCCESS',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    for (const log of res.json().data.items) {
      expect(log.status).toBe('SUCCESS');
    }
  });

  it('SO confirm auto-pushes to WMS and stores wmsOrderId', async () => {
    // Create a fresh quote + SO for this test (shouldn't reuse the fake SO from setup)
    const qRes = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        items: [{ productId, qty: 1, unitPrice: 89000 }],
      },
    });
    quoteId = qRes.json().data.id;
    await app.inject({
      method: 'POST',
      url: `/api/v1/internal/quotations/${quoteId}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'SENT' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/internal/quotations/${quoteId}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'ACCEPTED' },
    });
    const soRes = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/sales-orders/from-quote',
      headers: authHeader(salesToken),
      payload: { quotationId: quoteId },
    });
    const newSoId = soRes.json().data.id as string;

    // Confirm → should trigger WMS push
    const confirm = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/sales-orders/${newSoId}/status`,
      headers: authHeader(salesToken),
      payload: { status: 'CONFIRMED' },
    });
    expect(confirm.statusCode).toBe(200);

    // Check wmsOrderId got populated
    const updated = await prisma.salesOrder.findUnique({ where: { id: newSoId } });
    expect(updated!.wmsOrderId).toMatch(/^WMS-MOCK-/);

    // There should be a sync log for this push
    const log = await prisma.wmsSyncLog.findFirst({
      where: { entity: 'sales_order', action: 'push' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.status).toBe('SUCCESS');

    // Cleanup
    await prisma.paymentMilestone.deleteMany({ where: { soId: newSoId } });
    await prisma.sOItem.deleteMany({ where: { soId: newSoId } });
    await prisma.salesOrder.delete({ where: { id: newSoId } });
  });
});

describe('Sprint 4 — Reports', () => {
  it('GET /reports/summary returns nested KPIs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/reports/summary',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.sales.customers).toBeGreaterThanOrEqual(1);
    expect(d.sales.quotesThisMonth).toBeGreaterThanOrEqual(0);
    expect(d.operations.assetsTotal).toBeGreaterThanOrEqual(1);
    expect(d.afterSales.ticketsOpen).toBeGreaterThanOrEqual(0);
  });

  it('GET /reports/pipeline groups by stage with count + value', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/reports/pipeline',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    // Each entry should have count + totalValue (if there are any leads)
    for (const v of Object.values(res.json().data) as Array<{ count: number; totalValue: number }>) {
      expect(typeof v.count).toBe('number');
      expect(typeof v.totalValue).toBe('number');
    }
  });

  it('GET /reports/sales-by-brand returns per-brand revenue', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/reports/sales-by-brand',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().data).toBe('object');
  });

  it('GET /reports/tickets-by-stage returns counts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/reports/tickets-by-stage',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Sprint 4 — Tech routes', () => {
  it('INSTALL and SERVICE can list their own tickets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tech/me/tickets',
      headers: authHeader(serviceToken),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it('SALES cannot access tech endpoints (forbidden)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tech/me/tickets',
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /tech/location saves GPS ping (idempotent upsert)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tech/location',
      headers: authHeader(serviceToken),
      payload: { lat: 13.7442, lng: 100.5413, accuracy: 15 },
    });
    expect(res.statusCode).toBe(200);

    // Second ping updates same row
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/tech/location',
      headers: authHeader(serviceToken),
      payload: { lat: 13.75, lng: 100.55, accuracy: 10 },
    });
    expect(res2.statusCode).toBe(200);

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: authHeader(serviceToken),
    });
    const techId = me.json().data.user.id;

    const loc = await prisma.techLocation.findUnique({ where: { techId } });
    expect(loc).toBeTruthy();
    expect(Number(loc!.lat)).toBeCloseTo(13.75, 1);
  });

  it('POST /tech/location rejects bad coordinates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tech/location',
      headers: authHeader(serviceToken),
      payload: { lat: 200, lng: 0 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /tech/settings returns GPS interval', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tech/settings',
      headers: authHeader(serviceToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.gps_interval_seconds).toBeDefined();
  });

  it('Tech stage update rejects non-owner', async () => {
    // Create a ticket assigned to nobody
    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNo: `T-TEST-${Date.now()}`,
        customerId: SAMPLE_CUSTOMER_ID,
        assetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'test for tech route',
        stage: 'RECEIVED',
        assignedTechId: null, // unassigned
      },
    });
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tech/tickets/${ticket.id}/stage`,
        headers: authHeader(serviceToken),
        payload: { stage: 'REPAIRING' },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('NOT_OWNER');
    } finally {
      await prisma.ticketEvent.deleteMany({ where: { ticketId: ticket.id } });
      await prisma.serviceTicket.delete({ where: { id: ticket.id } });
    }
  });
});
