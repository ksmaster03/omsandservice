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
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
  }
  await app.close();
  await prisma.$disconnect();
});

describe('GET /api/v1/internal/users', () => {
  it('blocks non-admin staff', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/users',
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns users for ADMIN (without passwordHash)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(7);
    for (const u of body.data.items) {
      expect(u.passwordHash).toBeUndefined();
      expect(u.email).toBeDefined();
      expect(u.role).toBeDefined();
    }
  });

  it('filters by role=SERVICE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/users?role=SERVICE',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    for (const u of res.json().data.items) {
      expect(u.role).toBe('SERVICE');
    }
  });
});

describe('POST /api/v1/internal/users', () => {
  it('ADMIN creates a new staff user', async () => {
    const email = `test-${Date.now()}@nba.local`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
      payload: {
        email,
        password: 'InitialPass123',
        name: 'New Staff',
        role: 'SALES',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.email).toBe(email);
    expect(body.data.passwordHash).toBeUndefined();
    createdIds.push(body.data.id);

    // Verify can log in with new credentials
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'InitialPass123' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('rejects duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
      payload: {
        email: 'admin@nbasport.local',
        password: 'whatever123',
        name: 'Duplicate',
        role: 'SALES',
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DUPLICATE_EMAIL');
  });

  it('rejects invalid role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
      payload: {
        email: `invalid-${Date.now()}@nba.local`,
        password: 'password123',
        name: 'Test',
        role: 'HACKER',
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /api/v1/internal/users/:id', () => {
  it('updates user role', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
      payload: {
        email: `role-${Date.now()}@nba.local`,
        password: 'password123',
        name: 'Role Test',
        role: 'SALES',
      },
    });
    const id = created.json().data.id as string;
    createdIds.push(id);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/internal/users/${id}`,
      headers: authHeader(adminToken),
      payload: { role: 'SERVICE', active: false },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.role).toBe('SERVICE');
    expect(updated.json().data.active).toBe(false);
  });
});

describe('POST /api/v1/internal/users/:id/password', () => {
  it('ADMIN can reset password', async () => {
    const email = `pwreset-${Date.now()}@nba.local`;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/users',
      headers: authHeader(adminToken),
      payload: { email, password: 'OldPass12345', name: 'PW Reset', role: 'SALES' },
    });
    const id = created.json().data.id as string;
    createdIds.push(id);

    const reset = await app.inject({
      method: 'POST',
      url: `/api/v1/internal/users/${id}/password`,
      headers: authHeader(adminToken),
      payload: { newPassword: 'BrandNew456' },
    });
    expect(reset.statusCode).toBe(200);

    // Old password no longer works
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'OldPass12345' },
    });
    expect(oldLogin.statusCode).toBe(401);

    // New password works
    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'BrandNew456' },
    });
    expect(newLogin.statusCode).toBe(200);
  });
});
