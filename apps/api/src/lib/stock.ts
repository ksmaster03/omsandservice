/**
 * Stock reservation service.
 *
 * Lifecycle:
 *   SO confirm   → reserveForOrder()     — creates ACTIVE reservations
 *   SO cancel    → releaseForOrder()     — flips ACTIVE → RELEASED
 *   Install done → consumeForOrder()     — flips ACTIVE → CONSUMED + decrements onHand
 *
 * Runs inside a single DB transaction per call so the StockItem.reserved
 * counter stays in sync with the reservation rows.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export class StockShortfallError extends Error {
  constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = 'StockShortfallError';
  }
}

export interface ReservationLine {
  soItemId: string;
  productId: string;
  qty: number;
}

/** Ensure a StockItem row exists for every product passed in. Used as a one-shot
 *  "turn on stock tracking for this product" helper. */
export async function ensureStockItems(
  tx: Prisma.TransactionClient,
  productIds: string[],
): Promise<void> {
  for (const productId of productIds) {
    await tx.stockItem.upsert({
      where: { productId },
      update: {},
      create: { productId, onHand: 0, reserved: 0 },
    });
  }
}

/**
 * Reserve stock for every line of a Sales Order. Atomic per-SO: throws
 * StockShortfallError if ANY line cannot be satisfied (nothing gets reserved).
 *
 * Idempotent: if the SO already has ACTIVE reservations, returns them unchanged.
 */
export async function reserveForOrder(
  soId: string,
  lines: ReservationLine[],
): Promise<{ reservationIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    // Idempotency check
    const existing = await tx.stockReservation.findMany({
      where: { soId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (existing.length > 0) {
      return { reservationIds: existing.map((r) => r.id) };
    }

    await ensureStockItems(
      tx,
      lines.map((l) => l.productId),
    );

    // Collapse lines by productId so a SO with two of the same SKU
    // only reserves once at the collapsed qty. Per-line reservations still
    // get created for traceability.
    const needed = new Map<string, number>();
    for (const l of lines) {
      needed.set(l.productId, (needed.get(l.productId) ?? 0) + l.qty);
    }

    // Validate availability for each product
    for (const [productId, qty] of needed) {
      const item = await tx.stockItem.findUnique({ where: { productId } });
      if (!item) throw new StockShortfallError(productId, qty, 0);
      const available = item.onHand - item.reserved;
      if (available < qty) {
        throw new StockShortfallError(productId, qty, available);
      }
    }

    // Bump reserved counter + create reservation rows
    for (const [productId, qty] of needed) {
      await tx.stockItem.update({
        where: { productId },
        data: { reserved: { increment: qty } },
      });
    }

    const created: { id: string }[] = [];
    for (const l of lines) {
      const item = await tx.stockItem.findUnique({ where: { productId: l.productId } });
      const row = await tx.stockReservation.create({
        data: {
          stockItemId: item!.id,
          productId: l.productId,
          soId,
          soItemId: l.soItemId,
          qty: l.qty,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      created.push(row);
    }

    return { reservationIds: created.map((r) => r.id) };
  });
}

/** Release ACTIVE reservations for an SO (on cancel). Idempotent. */
export async function releaseForOrder(soId: string, reason?: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const active = await tx.stockReservation.findMany({
      where: { soId, status: 'ACTIVE' },
      select: { id: true, productId: true, qty: true },
    });
    if (active.length === 0) return 0;

    const bucket = new Map<string, number>();
    for (const r of active) {
      bucket.set(r.productId, (bucket.get(r.productId) ?? 0) + r.qty);
    }
    for (const [productId, qty] of bucket) {
      await tx.stockItem.update({
        where: { productId },
        data: { reserved: { decrement: qty } },
      });
    }
    await tx.stockReservation.updateMany({
      where: { soId, status: 'ACTIVE' },
      data: { status: 'RELEASED', releasedAt: new Date(), note: reason ?? null },
    });
    return active.length;
  });
}

/** Consume ACTIVE reservations for an SO (on install complete): flip to CONSUMED
 *  and decrement onHand. Also decrements reserved back down. Idempotent. */
export async function consumeForOrder(soId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const active = await tx.stockReservation.findMany({
      where: { soId, status: 'ACTIVE' },
      select: { id: true, productId: true, qty: true },
    });
    if (active.length === 0) return 0;

    const bucket = new Map<string, number>();
    for (const r of active) {
      bucket.set(r.productId, (bucket.get(r.productId) ?? 0) + r.qty);
    }
    for (const [productId, qty] of bucket) {
      await tx.stockItem.update({
        where: { productId },
        data: {
          reserved: { decrement: qty },
          onHand: { decrement: qty },
        },
      });
    }
    await tx.stockReservation.updateMany({
      where: { soId, status: 'ACTIVE' },
      data: { status: 'CONSUMED', consumedAt: new Date() },
    });
    return active.length;
  });
}

/** Available-to-promise for a single product. Returns max(0, onHand - reserved). */
export async function availableFor(productId: string): Promise<number> {
  const item = await prisma.stockItem.findUnique({ where: { productId } });
  if (!item) return 0;
  return Math.max(0, item.onHand - item.reserved);
}

/**
 * Sweep orphan reservations: ACTIVE rows whose parent SO is CANCELLED
 * (or whose SO no longer exists). Releases the reservation and rebalances
 * StockItem.reserved. Idempotent — safe to run on a schedule.
 *
 * Runs on a 10-minute interval registered in server.ts. Logs the count
 * so the cleanup is visible in logs without spamming when nothing's wrong.
 */
export async function sweepOrphanReservations(): Promise<{ released: number; consistencyFixed: number }> {
  return prisma.$transaction(async (tx) => {
    // Find ACTIVE reservations whose SO is now CANCELLED
    const orphans = await tx.stockReservation.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, soId: true, productId: true, qty: true },
    });
    if (orphans.length === 0) {
      return { released: 0, consistencyFixed: 0 };
    }

    const soIds = Array.from(new Set(orphans.map((o) => o.soId)));
    const sos = await tx.salesOrder.findMany({
      where: { id: { in: soIds } },
      select: { id: true, status: true },
    });
    const soMap = new Map(sos.map((s) => [s.id, s.status]));

    const toRelease = orphans.filter((o) => {
      const status = soMap.get(o.soId);
      return status === undefined || status === 'CANCELLED';
    });

    if (toRelease.length === 0) {
      return { released: 0, consistencyFixed: 0 };
    }

    // Decrement reserved counter per product
    const bucket = new Map<string, number>();
    for (const r of toRelease) {
      bucket.set(r.productId, (bucket.get(r.productId) ?? 0) + r.qty);
    }
    for (const [productId, qty] of bucket) {
      await tx.stockItem.update({
        where: { productId },
        data: { reserved: { decrement: qty } },
      });
    }
    await tx.stockReservation.updateMany({
      where: { id: { in: toRelease.map((r) => r.id) } },
      data: { status: 'RELEASED', releasedAt: new Date(), note: 'sweep: orphan cleanup' },
    });

    return { released: toRelease.length, consistencyFixed: 0 };
  });
}
