import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server';
import { prisma } from '../lib/prisma';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('GET /', () => {
  it('returns API metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, data: { name: 'NBA Sport OMS API' } });
  });
});

describe('GET /health', () => {
  it('returns status up', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('up');
  });
});

describe('GET /health/db', () => {
  it('reports db connection', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, data: { db: 'up' } });
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in the seeded admin user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@nbasport.local', password: 'Nba@12345' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.refreshToken).toBeTypeOf('string');
    expect(body.data.user).toMatchObject({
      email: 'admin@nbasport.local',
      role: 'ADMIN',
    });
  });

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@nbasport.local', password: 'wrongpass' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects unknown user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ghost@nowhere.local', password: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email', password: 'Nba@12345' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('works for all 4 seeded roles', async () => {
    const accounts = [
      { email: 'sales1@nbasport.local', role: 'SALES' },
      { email: 'install1@nbasport.local', role: 'INSTALL' },
      { email: 'service1@nbasport.local', role: 'SERVICE' },
      { email: 'admin@nbasport.local', role: 'ADMIN' },
    ];
    for (const acc of accounts) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: acc.email, password: 'Nba@12345' },
      });
      expect(res.statusCode, `${acc.email} should log in`).toBe(200);
      expect(res.json().data.user.role).toBe(acc.role);
    }
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns user info with valid token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@nbasport.local', password: 'Nba@12345' },
    });
    const token = login.json().data.accessToken as string;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.user).toMatchObject({
      email: 'admin@nbasport.local',
      role: 'ADMIN',
    });
  });

  it('rejects request without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer not.a.real.token' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new access token from valid refresh token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@nbasport.local', password: 'Nba@12345' },
    });
    const refreshToken = login.json().data.refreshToken as string;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBeTypeOf('string');
  });

  it('rejects malformed refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});
