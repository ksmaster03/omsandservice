import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';

let app: FastifyInstance;
let adminToken: string;
let salesToken: string;
const createdIds: string[] = [];

beforeAll(async () => {
  app = await makeTestApp();
  adminToken = await loginAs(app, 'admin@nbasport.local');
  salesToken = await loginAs(app, 'sales1@nbasport.local');
});

afterAll(async () => {
  if (createdIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: createdIds } } });
  }
  await app.close();
  await prisma.$disconnect();
});

describe('GET /api/v1/internal/products', () => {
  it('returns seeded products', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(5);
  });

  it('filters by brand=MAXNUM', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/products?brand=MAXNUM',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    for (const p of res.json().data.items) {
      expect(p.brand).toBe('MAXNUM');
    }
  });

  it('rejects invalid brand', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/products?brand=NOTABRAND',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(400);
  });

  it('search matches sku or name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/products?search=treadmill',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/v1/internal/products', () => {
  it('ADMIN can create product', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
      payload: {
        sku: 'TEST-SKU-' + Date.now(),
        brand: 'ANYFIT',
        name: 'Test Product',
        category: 'Testing',
        price: 12345.67,
        warrantyMonths: 12,
        pmIntervalMonths: 6,
      },
    });
    expect(res.statusCode).toBe(201);
    createdIds.push(res.json().data.id);
  });

  it('SALES cannot create product (forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(salesToken),
      payload: {
        sku: 'SALES-WONT-' + Date.now(),
        brand: 'IMPULSE',
        name: 'Should Fail',
        category: 'X',
        price: 1,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects duplicate SKU', async () => {
    const sku = 'DUP-' + Date.now();
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
      payload: { sku, brand: 'IMPULSE', name: 'First', category: 'X', price: 100 },
    });
    createdIds.push(first.json().data.id);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
      payload: { sku, brand: 'IMPULSE', name: 'Second', category: 'X', price: 100 },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('DUPLICATE_SKU');
  });

  it('rejects lowercase sku', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
      payload: { sku: 'lower-case', brand: 'MAXNUM', name: 'X', category: 'X', price: 1 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/internal/products/:id soft-deletes', () => {
  it('sets active=false without removing row', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/products',
      headers: authHeader(adminToken),
      payload: {
        sku: 'SOFT-DEL-' + Date.now(),
        brand: 'GORILLA_TECK',
        name: 'To be deactivated',
        category: 'X',
        price: 999,
      },
    });
    const id = created.json().data.id as string;
    createdIds.push(id);

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/internal/products/${id}`,
      headers: authHeader(adminToken),
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().data.deactivated).toBe(true);

    const check = await prisma.product.findUnique({ where: { id } });
    expect(check?.active).toBe(false);
  });
});
