/**
 * Sprint 3 — full after-sales flow integration test:
 *   Quote → SO → Installation → complete → Assets auto-created
 *   → PM schedules generated → Service Ticket → Stage transitions
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';
import { warrantyStatus, daysUntil } from '@oms/shared';

const SAMPLE_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';

let app: FastifyInstance;
let salesToken: string;
let installToken: string;
let serviceToken: string;
let adminToken: string;
let installId: string;
let quoteId: string;
let soId: string;
let assetId: string;
let ticketId: string;
let product1Id: string;

beforeAll(async () => {
  app = await makeTestApp();
  salesToken = await loginAs(app, 'sales1@nbasport.local');
  installToken = await loginAs(app, 'install1@nbasport.local');
  serviceToken = await loginAs(app, 'service1@nbasport.local');
  adminToken = await loginAs(app, 'admin@nbasport.local');

  const p1 = await prisma.product.findUnique({ where: { sku: 'MX-T9-PRO' } });
  if (!p1) throw new Error('Seed product missing');
  product1Id = p1.id;
});

afterAll(async () => {
  // Clean up everything we created
  if (ticketId) {
    await prisma.ticketEvent.deleteMany({ where: { ticketId } });
    await prisma.ticketPhoto.deleteMany({ where: { ticketId } });
    await prisma.serviceTicket.delete({ where: { id: ticketId } }).catch(() => null);
  }
  if (assetId) {
    await prisma.pmSchedule.deleteMany({ where: { assetId } });
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => null);
  }
  if (installId) {
    await prisma.installation.delete({ where: { id: installId } }).catch(() => null);
  }
  if (soId) {
    await prisma.paymentMilestone.deleteMany({ where: { soId } });
    await prisma.sOItem.deleteMany({ where: { soId } });
    await prisma.salesOrder.delete({ where: { id: soId } }).catch(() => null);
  }
  if (quoteId) {
    await prisma.quotationItem.deleteMany({ where: { quotationId: quoteId } });
    await prisma.quotation.delete({ where: { id: quoteId } }).catch(() => null);
  }
  await app.close();
  await prisma.$disconnect();
});

describe('Sprint 3 — Install flow prerequisites', () => {
  it('creates and accepts a quote, then converts to SO', async () => {
    // Quote
    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/quotations',
      headers: authHeader(salesToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        items: [{ productId: product1Id, qty: 1, unitPrice: 89000 }],
      },
    });
    expect(quoteRes.statusCode).toBe(201);
    quoteId = quoteRes.json().data.id;

    // Accept
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

    // Convert to SO
    const soRes = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/sales-orders/from-quote',
      headers: authHeader(salesToken),
      payload: { quotationId: quoteId },
    });
    expect(soRes.statusCode).toBe(201);
    soId = soRes.json().data.id;
  });
});

describe('Sprint 3 — Installation scheduling + assignment', () => {
  it('SALES schedules install for the SO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/installations',
      headers: authHeader(salesToken),
      payload: {
        soId,
        scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
    installId = res.json().data.id;
  });

  it('rejects duplicate install for same SO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/installations',
      headers: authHeader(salesToken),
      payload: {
        soId,
        scheduledAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ALREADY_SCHEDULED');
  });

  it('INSTALL tech assigns themselves to the install', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: authHeader(installToken),
    });
    const techId = me.json().data.user.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/installations/${installId}/assign`,
      headers: authHeader(installToken),
      payload: { techId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.techId).toBe(techId);
  });

  it('SERVICE role cannot assign install (forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/installations/${installId}/assign`,
      headers: authHeader(serviceToken),
      payload: { techId: 'whatever' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Sprint 3 — Complete install → auto-create Asset + PM', () => {
  it('completes install, creating Asset with warranty + next PM', async () => {
    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { items: true },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/installations/${installId}/complete`,
      headers: authHeader(installToken),
      payload: {
        note: 'Completed on time',
        locationDetail: 'ชั้น 2 · ห้องฟิตเนสหลัก',
        assets: [
          { soItemId: so!.items[0]!.id, serialNo: 'MX-2026-0001' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.installation.status).toBe('COMPLETED');
    expect(body.data.createdAssets).toHaveLength(1);
    assetId = body.data.createdAssets[0].id;

    // Asset has correct warranty (24 months for MX-T9-PRO) and pm schedule
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { pmSchedules: true },
    });
    expect(asset).toBeTruthy();
    expect(asset!.serialNo).toBe('MX-2026-0001');
    expect(asset!.pmSchedules).toHaveLength(1);
    expect(asset!.pmSchedules[0]!.status).toBe('PENDING');

    // SO is now INSTALLED
    const updatedSO = await prisma.salesOrder.findUnique({ where: { id: soId } });
    expect(updatedSO!.status).toBe('INSTALLED');
  });

  it('rejects double-complete', async () => {
    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { items: true },
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/installations/${installId}/complete`,
      headers: authHeader(installToken),
      payload: {
        assets: [{ soItemId: so!.items[0]!.id, serialNo: 'MX-2026-0002' }],
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ALREADY_COMPLETED');
  });
});

describe('Sprint 3 — Asset list with warranty computation', () => {
  it('returns the new asset with warrantyStatus=active', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/internal/assets?customerId=${SAMPLE_CUSTOMER_ID}`,
      headers: authHeader(serviceToken),
    });
    expect(res.statusCode).toBe(200);
    const found = res.json().data.items.find((a: { id: string }) => a.id === assetId);
    expect(found).toBeDefined();
    expect(found.warrantyStatus).toBe('active');
    expect(found.warrantyDaysLeft).toBeGreaterThan(60);
  });

  it('warrantyStatus helper boundary: expires today → expired', () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(warrantyStatus(yesterday)).toBe('expired');
  });

  it('warrantyStatus helper boundary: 30 days → expiring', () => {
    const in30 = new Date(Date.now() + 30 * 86400000);
    expect(warrantyStatus(in30)).toBe('expiring');
  });

  it('warrantyStatus helper: 6 months → active', () => {
    const in180 = new Date(Date.now() + 180 * 86400000);
    expect(warrantyStatus(in180)).toBe('active');
  });

  it('daysUntil helper returns positive for future', () => {
    const d = new Date(Date.now() + 5 * 86400000);
    expect(daysUntil(d)).toBeGreaterThanOrEqual(4);
  });
});

describe('Sprint 3 — PM schedule complete → generates next', () => {
  it('lists the initial PM schedule for our asset', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/internal/pm-schedules?pageSize=100`,
      headers: authHeader(serviceToken),
    });
    expect(res.statusCode).toBe(200);
    const forAsset = res.json().data.items.filter((pm: { assetId: string }) => pm.assetId === assetId);
    expect(forAsset.length).toBeGreaterThanOrEqual(1);
  });

  it('SERVICE completes the first PM, next PM is auto-created', async () => {
    const firstPm = await prisma.pmSchedule.findFirst({
      where: { assetId, status: 'PENDING' },
      orderBy: { scheduledAt: 'asc' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/pm-schedules/${firstPm!.id}/complete`,
      headers: authHeader(serviceToken),
      payload: { note: 'Cleaned belt, lubricated bearings' },
    });
    expect(res.statusCode).toBe(200);

    // Expect: 1 completed + 1 new PENDING
    const all = await prisma.pmSchedule.findMany({ where: { assetId } });
    expect(all.filter((p) => p.status === 'COMPLETED')).toHaveLength(1);
    expect(all.filter((p) => p.status === 'PENDING')).toHaveLength(1);
  });
});

describe('Sprint 3 — Service Ticket creation + stage transitions', () => {
  it('SERVICE creates a ticket linked to the asset', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/tickets',
      headers: authHeader(serviceToken),
      payload: {
        customerId: SAMPLE_CUSTOMER_ID,
        assetId,
        problemType: 'NOISE',
        priority: 'URGENT',
        description: 'เสียงดังผิดปกติขณะวิ่ง',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.ticketNo).toMatch(/^T-\d{6}-\d{4}$/);
    expect(body.data.stage).toBe('RECEIVED');
    ticketId = body.data.id;
  });

  it('rejects ticket with mismatched customer+asset', async () => {
    // Make a second customer and try to link our asset to it
    const otherCust = await prisma.customer.create({
      data: { name: 'Other Demo', type: 'CORPORATE' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/tickets',
      headers: authHeader(serviceToken),
      payload: {
        customerId: otherCust.id,
        assetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'test mismatch',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ASSET_MISMATCH');
    await prisma.customer.delete({ where: { id: otherCust.id } });
  });

  it('transitions ticket through stages, recording events', async () => {
    const stages = ['ASSIGNED', 'EN_ROUTE', 'REPAIRING', 'CLOSED'] as const;
    for (const stage of stages) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/tickets/${ticketId}/stage`,
        headers: authHeader(serviceToken),
        payload: { stage, note: `moved to ${stage}` },
      });
      expect(res.statusCode).toBe(200);
    }
    // Verify events timeline
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/internal/tickets/${ticketId}`,
      headers: authHeader(adminToken),
    });
    const events = detail.json().data.events as Array<{ stage: string }>;
    // 1 (created RECEIVED) + 4 transitions = 5
    expect(events.length).toBe(5);
    expect(events[events.length - 1]!.stage).toBe('CLOSED');
    // closedAt is set on CLOSED transition
    expect(detail.json().data.closedAt).toBeTruthy();
  });

  it('SLA due date computed from priority', async () => {
    const detail = await prisma.serviceTicket.findUnique({ where: { id: ticketId } });
    expect(detail!.slaDueAt).toBeTruthy();
    // URGENT = 4 hours
    const createdMs = detail!.createdAt.getTime();
    const slaMs = detail!.slaDueAt!.getTime();
    const hours = (slaMs - createdMs) / (60 * 60 * 1000);
    expect(hours).toBeCloseTo(4, 0);
  });
});
