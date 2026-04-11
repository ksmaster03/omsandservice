import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';

let app: FastifyInstance;
let adminToken: string;
let salesToken: string;
let installToken: string;

// Track customers created during tests so we can clean up
const createdIds: string[] = [];

beforeAll(async () => {
  app = await makeTestApp();
  adminToken = await loginAs(app, 'admin@nbasport.local');
  salesToken = await loginAs(app, 'sales1@nbasport.local');
  installToken = await loginAs(app, 'install1@nbasport.local');
});

afterAll(async () => {
  // Cleanup any test customers
  if (createdIds.length) {
    await prisma.customer.deleteMany({ where: { id: { in: createdIds } } });
  }
  await app.close();
  await prisma.$disconnect();
});

afterEach(() => {
  // Do nothing between tests — cleanup happens at the end
});

describe('GET /api/v1/internal/customers', () => {
  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/internal/customers' });
    expect(res.statusCode).toBe(401);
  });

  it('returns paginated list for staff', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/customers?page=1&pageSize=10',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      page: 1,
      pageSize: 10,
    });
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(typeof body.data.total).toBe('number');
    expect(body.data.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid pagination query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/customers?page=0',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(400);
  });

  it('filters by type=CORPORATE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/customers?type=CORPORATE',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const item of body.data.items) {
      expect(item.type).toBe('CORPORATE');
    }
  });
});

describe('POST /api/v1/internal/customers', () => {
  it('allows SALES to create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/customers',
      headers: authHeader(salesToken),
      payload: {
        name: 'Test Gym Bangkok ' + Date.now(),
        type: 'CORPORATE',
        phone: '021111111',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.name).toContain('Test Gym');
    createdIds.push(body.data.id);
  });

  it('allows ADMIN to create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/customers',
      headers: authHeader(adminToken),
      payload: {
        name: 'Admin Created ' + Date.now(),
        type: 'INDIVIDUAL',
      },
    });
    expect(res.statusCode).toBe(201);
    createdIds.push(res.json().data.id);
  });

  it('forbids INSTALL role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/customers',
      headers: authHeader(installToken),
      payload: { name: 'Should Fail' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/customers',
      headers: authHeader(adminToken),
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/internal/customers/:id', () => {
  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/customers/00000000-0000-0000-0000-999999999999',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns the sample customer with counts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/customers/00000000-0000-0000-0000-000000000001',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.name).toContain('The Fitness BKK');
    expect(body.data._count).toBeDefined();
  });
});

describe('PATCH /api/v1/internal/customers/:id', () => {
  it('updates an existing customer', async () => {
    // Create first
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/customers',
      headers: authHeader(adminToken),
      payload: { name: 'ToUpdate ' + Date.now() },
    });
    const id = created.json().data.id as string;
    createdIds.push(id);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/internal/customers/${id}`,
      headers: authHeader(adminToken),
      payload: { phone: '029999999' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.phone).toBe('029999999');
  });
});
