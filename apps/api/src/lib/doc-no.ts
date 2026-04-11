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
