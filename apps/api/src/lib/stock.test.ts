import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './prisma';
import { reserveForOrder, releaseForOrder, consumeForOrder, availableFor, StockShortfallError } from './stock';

beforeEach(async () => {
  await prisma.stockReservation.deleteMany({});
  await prisma.stockItem.deleteMany({});
});

describe('stock reservation service', () => {
  it('reserves stock and decrements available', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;
    const pid = products[0]!.id;

    // Set up stock
    await prisma.stockItem.create({
      data: { productId: pid, onHand: 10, reserved: 0 },
    });

    const result = await reserveForOrder('test-so-1', [
      { soItemId: 'item-1', productId: pid, qty: 3 },
    ]);

    expect(result.reservationIds.length).toBe(1);

    const avail = await availableFor(pid);
    expect(avail).toBe(7);
  });

  it('throws StockShortfallError when not enough stock', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;
    const pid = products[0]!.id;

    await prisma.stockItem.create({
      data: { productId: pid, onHand: 2, reserved: 0 },
    });

    await expect(
      reserveForOrder('test-so-2', [
        { soItemId: 'item-2', productId: pid, qty: 5 },
      ]),
    ).rejects.toThrow(StockShortfallError);
  });

  it('is idempotent on duplicate reserveForOrder call', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;
    const pid = products[0]!.id;

    await prisma.stockItem.create({
      data: { productId: pid, onHand: 10, reserved: 0 },
    });

    const r1 = await reserveForOrder('test-so-3', [
      { soItemId: 'item-3', productId: pid, qty: 2 },
    ]);
    const r2 = await reserveForOrder('test-so-3', [
      { soItemId: 'item-3', productId: pid, qty: 2 },
    ]);

    expect(r1.reservationIds).toEqual(r2.reservationIds);
    const avail = await availableFor(pid);
    expect(avail).toBe(8);
  });

  it('releaseForOrder returns reservations to available', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;
    const pid = products[0]!.id;

    await prisma.stockItem.create({
      data: { productId: pid, onHand: 10, reserved: 0 },
    });
    await reserveForOrder('test-so-4', [
      { soItemId: 'item-4', productId: pid, qty: 4 },
    ]);

    const released = await releaseForOrder('test-so-4', 'cancelled');
    expect(released).toBe(1);

    const avail = await availableFor(pid);
    expect(avail).toBe(10);
  });

  it('consumeForOrder decrements onHand and removes reservation', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    if (products.length === 0) return;
    const pid = products[0]!.id;

    await prisma.stockItem.create({
      data: { productId: pid, onHand: 10, reserved: 0 },
    });
    await reserveForOrder('test-so-5', [
      { soItemId: 'item-5', productId: pid, qty: 3 },
    ]);
    await consumeForOrder('test-so-5');

    const item = await prisma.stockItem.findUnique({ where: { productId: pid } });
    expect(item?.onHand).toBe(7);
    expect(item?.reserved).toBe(0);

    const avail = await availableFor(pid);
    expect(avail).toBe(7);
  });
});
