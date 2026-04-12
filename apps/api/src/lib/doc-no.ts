/**
 * Generate sequential document numbers (quote/SO/ticket/etc).
 *
 * Format: <PREFIX>-<YYYYMM>-<NNNN>
 * Example: Q-202604-0001
 *
 * Uses a DB count of rows created this month — good enough for MVP.
 * For true concurrency safety later, move to a sequence table.
 */
import { prisma } from './prisma';

function monthPrefix(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function nextQuoteNo(): Promise<string> {
  const ym = monthPrefix();
  const count = await prisma.quotation.count({
    where: { quoteNo: { startsWith: `Q-${ym}-` } },
  });
  return `Q-${ym}-${String(count + 1).padStart(4, '0')}`;
}

export async function nextSalesOrderNo(): Promise<string> {
  const ym = monthPrefix();
  const count = await prisma.salesOrder.count({
    where: { soNo: { startsWith: `SO-${ym}-` } },
  });
  return `SO-${ym}-${String(count + 1).padStart(4, '0')}`;
}

export async function nextTicketNo(): Promise<string> {
  const ym = monthPrefix();
  const count = await prisma.serviceTicket.count({
    where: { ticketNo: { startsWith: `T-${ym}-` } },
  });
  return `T-${ym}-${String(count + 1).padStart(4, '0')}`;
}

export async function nextRmaNo(): Promise<string> {
  const ym = monthPrefix();
  const count = await prisma.rma.count({
    where: { rmaNo: { startsWith: `R-${ym}-` } },
  });
  return `R-${ym}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * business_key correlation id. Generated once per aggregate root
 * (SO, Installation, Ticket, RMA) to give log grep a stable handle
 * across all related events. Format: "<prefix>-<docNo>-<rand>"
 */
export function makeBusinessKey(prefix: string, docNo: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${docNo}-${rand}`;
}
