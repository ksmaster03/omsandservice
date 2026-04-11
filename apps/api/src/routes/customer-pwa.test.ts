/**
 * Sprint 5 — Customer PWA auth + data scoping.
 *
 * Critical: verify a customer can only see their own assets + tickets.
 * This is the security boundary for the PWA.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';

const SAMPLE_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
const SAMPLE_PHONE = '0891234567';

let app: FastifyInstance;
let customerToken: string;
let myAssetId: string;
let mySoId: string;
let otherCustomerId: string;
let otherAssetId: string;
let otherSoId: string;
let myTicketId: string;

async function customerLogin(phone: string): Promise<string> {
  const verify = await app.inject({
    method: 'POST',
    url: '/api/v1/customer/auth/verify-otp',
    payload: { phone, code: '000000' },
  });
  if (verify.statusCode !== 200) throw new Error(`login failed: ${verify.body}`);
  return verify.json().data.accessToken as string;
}

beforeAll(async () => {
  app = await makeTestApp();

  // Create a test asset for the sample customer (skip full install flow)
  const product = await prisma.product.findUnique({ where: { sku: 'MX-T9-PRO' } });
  if (!product) throw new Error('Seed product missing');

  const mySO = await prisma.salesOrder.create({
    data: {
      soNo: `SO-PWA-${Date.now()}`,
      customerId: SAMPLE_CUSTOMER_ID,
      total: 89000,
      status: 'INSTALLED',
      items: { create: [{ productId: product.id, qty: 1, unitPrice: 89000 }] },
    },
  });
  mySoId = mySO.id;

  const myAsset = await prisma.asset.create({
    data: {
      serialNo: `PWA-TEST-${Date.now()}`,
      productId: product.id,
      customerId: SAMPLE_CUSTOMER_ID,
      soId: mySO.id,
      installedAt: new Date(),
      warrantyEnd: new Date(Date.now() + 500 * 86400000),
    },
  });
  myAssetId = myAsset.id;

  // Create a second customer + asset that our test customer should NOT see
  const other = await prisma.customer.create({
    data: { name: 'Other Customer (Sprint 5)', type: 'CORPORATE', phone: '0811111111' },
  });
  otherCustomerId = other.id;

  const otherSO = await prisma.salesOrder.create({
    data: {
      soNo: `SO-OTHER-${Date.now()}`,
      customerId: other.id,
      total: 42000,
      status: 'INSTALLED',
      items: { create: [{ productId: product.id, qty: 1, unitPrice: 42000 }] },
    },
  });
  otherSoId = otherSO.id;

  const otherAsset = await prisma.asset.create({
    data: {
      serialNo: `OTHER-SN-${Date.now()}`,
      productId: product.id,
      customerId: other.id,
      soId: otherSO.id,
      installedAt: new Date(),
      warrantyEnd: new Date(Date.now() + 500 * 86400000),
    },
  });
  otherAssetId = otherAsset.id;
});

afterAll(async () => {
  if (myTicketId) {
    await prisma.ticketEvent.deleteMany({ where: { ticketId: myTicketId } });
    await prisma.serviceTicket.delete({ where: { id: myTicketId } }).catch(() => null);
  }
  if (myAssetId) {
    await prisma.pmSchedule.deleteMany({ where: { assetId: myAssetId } });
    await prisma.asset.delete({ where: { id: myAssetId } }).catch(() => null);
  }
  if (mySoId) {
    await prisma.sOItem.deleteMany({ where: { soId: mySoId } });
    await prisma.salesOrder.delete({ where: { id: mySoId } }).catch(() => null);
  }
  if (otherAssetId) {
    await prisma.asset.delete({ where: { id: otherAssetId } }).catch(() => null);
  }
  if (otherSoId) {
    await prisma.sOItem.deleteMany({ where: { soId: otherSoId } });
    await prisma.salesOrder.delete({ where: { id: otherSoId } }).catch(() => null);
  }
  if (otherCustomerId) {
    await prisma.customerUser.deleteMany({ where: { customerId: otherCustomerId } });
    await prisma.customer.delete({ where: { id: otherCustomerId } }).catch(() => null);
  }
  await app.close();
  await prisma.$disconnect();
});

describe('Customer auth — dev OTP bypass', () => {
  it('request-otp returns dev_code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/request-otp',
      payload: { phone: SAMPLE_PHONE },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.dev_code).toBe('000000');
    expect(res.json().data.sent).toBe(true);
  });

  it('request-otp rejects malformed phone', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/request-otp',
      payload: { phone: 'abc' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('verify-otp returns JWT for registered phone + any 6-digit code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/verify-otp',
      payload: { phone: SAMPLE_PHONE, code: '123456' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.user.customerId).toBe(SAMPLE_CUSTOMER_ID);
    customerToken = body.data.accessToken;
  });

  it('verify-otp rejects non-6-digit code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/verify-otp',
      payload: { phone: SAMPLE_PHONE, code: '12345' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('verify-otp rejects unknown phone', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/verify-otp',
      payload: { phone: '0999999999', code: '000000' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('NOT_REGISTERED');
  });

  it('GET /customer/auth/me returns customer info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/auth/me',
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.customer.id).toBe(SAMPLE_CUSTOMER_ID);
    expect(res.json().data.customer.name).toContain('The Fitness BKK');
  });

  it('GET /customer/auth/me rejects missing token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/auth/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('staff JWT is rejected on customer endpoints (scope guard)', async () => {
    // Login as admin (staff scope)
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@nbasport.local', password: 'Nba@12345' },
    });
    const staffToken = login.json().data.accessToken;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/auth/me',
      headers: authHeader(staffToken),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('WRONG_SCOPE');
  });
});

describe('Customer data scoping', () => {
  it('GET /customer/assets returns only my assets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/assets',
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    const assets = res.json().data;
    // All assets belong to my customerId
    for (const a of assets) {
      expect(a.customerId).toBe(SAMPLE_CUSTOMER_ID);
    }
    // My asset is visible
    expect(assets.find((a: { id: string }) => a.id === myAssetId)).toBeDefined();
    // Other customer's asset is NOT visible
    expect(assets.find((a: { id: string }) => a.id === otherAssetId)).toBeUndefined();
  });

  it('GET /customer/assets/:id with other-customer id returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customer/assets/${otherAssetId}`,
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /customer/assets/:id with my id returns detail + warranty status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customer/assets/${myAssetId}`,
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.warrantyStatus).toBeDefined();
    expect(['active', 'expiring', 'expired']).toContain(res.json().data.warrantyStatus);
  });

  it('POST /customer/tickets creates ticket on my asset', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/tickets',
      headers: authHeader(customerToken),
      payload: {
        assetId: myAssetId,
        problemType: 'NOISE',
        priority: 'NORMAL',
        description: 'เสียงดังขณะวิ่ง',
        locationDetail: 'ชั้น 2 · โซน A',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.ticketNo).toMatch(/^T-\d{6}-\d{4}$/);
    expect(res.json().data.stage).toBe('RECEIVED');
    myTicketId = res.json().data.id;
  });

  it('POST /customer/tickets rejects other-customer asset (403 NOT_YOUR_ASSET)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/tickets',
      headers: authHeader(customerToken),
      payload: {
        assetId: otherAssetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'trying to hack',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('NOT_YOUR_ASSET');
  });

  it('POST /customer/tickets validates description min length', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/tickets',
      headers: authHeader(customerToken),
      payload: {
        assetId: myAssetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'hi',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /customer/tickets returns only my tickets with timeline events', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/tickets',
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    const tickets = res.json().data;
    // All tickets belong to me
    for (const t of tickets) {
      expect(t.customerId).toBe(SAMPLE_CUSTOMER_ID);
    }
    // My newly created ticket is in the list
    expect(tickets.find((t: { id: string }) => t.id === myTicketId)).toBeDefined();
  });

  it('GET /customer/tickets/:id returns full timeline for my ticket', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customer/tickets/${myTicketId}`,
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    const ticket = res.json().data;
    expect(ticket.events).toBeDefined();
    expect(ticket.events.length).toBeGreaterThanOrEqual(1);
    expect(ticket.events[0].stage).toBe('RECEIVED');
  });

  it('GET /customer/renewals returns empty or scoped list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/renewals',
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it('GET /customer/notifications returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/notifications',
      headers: authHeader(customerToken),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });
});
