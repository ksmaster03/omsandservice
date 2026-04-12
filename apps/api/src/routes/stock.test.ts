import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { prisma } from '../lib/prisma';

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  app = await buildServer();
  // Clean reservations
  await prisma.stockReservation.deleteMany({});
  await prisma.stockItem.deleteMany({});
});

async function adminLogin(): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'admin@nbasport.local', password: 'Nba@12345' },
  });
  return JSON.parse(res.body).data.accessToken;
}

describe('Stock API', () => {
  it('GET /stock returns empty array initially', async () => {
    const token = await adminLogin();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/stock',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /stock/set creates or updates stock item', async () => {
    const token = await adminLogin();
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return; // skip if no seed data

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/stock/set',
      headers: { authorization: `Bearer ${token}` },
      payload: { productId: products[0]!.id, onHand: 50, reorderAt: 5 },
    });
    expect(res.statusCode).toBe(200);

    const check = await prisma.stockItem.findUnique({ where: { productId: products[0]!.id } });
    expect(check?.onHand).toBe(50);
    expect(check?.reorderAt).toBe(5);
  });

  it('POST /stock/adjust changes onHand by delta', async () => {
    const token = await adminLogin();
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;

    // Set initial
    await app.inject({
      method: 'POST',
      url: '/api/v1/internal/stock/set',
      headers: { authorization: `Bearer ${token}` },
      payload: { productId: products[0]!.id, onHand: 10 },
    });

    // Adjust +5
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/stock/adjust',
      headers: { authorization: `Bearer ${token}` },
      payload: { productId: products[0]!.id, delta: 5 },
    });
    expect(res.statusCode).toBe(200);

    const check = await prisma.stockItem.findUnique({ where: { productId: products[0]!.id } });
    expect(check?.onHand).toBe(15);
  });
});
