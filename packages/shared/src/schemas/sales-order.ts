import { z } from 'zod';
import { listQuerySchema } from './pagination';

const SO_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_DELIVER',
  'INSTALLED',
  'COMPLETED',
  'CANCELLED',
] as const;

/** Create an SO directly from a quotation (preferred). */
export const createSalesOrderFromQuoteSchema = z.object({
  quotationId: z.string().uuid(),
  milestoneTemplate: z.enum(['30_30_40', '50_50', 'FULL']).default('30_30_40'),
});
export type CreateSalesOrderFromQuoteInput = z.infer<typeof createSalesOrderFromQuoteSchema>;

export const updateSalesOrderStatusSchema = z.object({
  status: z.enum(SO_STATUSES),
});
export type UpdateSalesOrderStatusInput = z.infer<typeof updateSalesOrderStatusSchema>;

export const salesOrderListQuerySchema = listQuerySchema.extend({
  status: z.enum(SO_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});
export type SalesOrderListQuery = z.infer<typeof salesOrderListQuerySchema>;

/**
 * Milestone template builder — given a total and template, returns
 * the list of milestones to create.
 * Default templates (match Thai fitness industry norms):
 *   - 30_30_40 → มัดจำ / ก่อนส่งมอบ / หลังติดตั้ง
 *   - 50_50    → มัดจำ / หลังติดตั้ง
 *   - FULL     → 100% upfront
 */
export function buildMilestones(
  total: number,
  template: '30_30_40' | '50_50' | 'FULL',
  baseDate = new Date(),
) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const day = 24 * 60 * 60 * 1000;
  const addDays = (d: number) => new Date(baseDate.getTime() + d * day);

  if (template === 'FULL') {
    return [{ seq: 1, label: 'ชำระเต็มจำนวน', amount: round2(total), dueDate: addDays(7) }];
  }
  if (template === '50_50') {
    return [
      { seq: 1, label: 'มัดจำ 50%', amount: round2(total * 0.5), dueDate: addDays(7) },
      { seq: 2, label: 'หลังติดตั้ง 50%', amount: round2(total * 0.5), dueDate: addDays(60) },
    ];
  }
  // default 30_30_40
  return [
    { seq: 1, label: 'มัดจำ 30%', amount: round2(total * 0.3), dueDate: addDays(7) },
    { seq: 2, label: 'ก่อนส่งมอบ 30%', amount: round2(total * 0.3), dueDate: addDays(30) },
    { seq: 3, label: 'หลังติดตั้ง 40%', amount: round2(total * 0.4), dueDate: addDays(60) },
  ];
}

export const markPaidSchema = z.object({
  paidAt: z.string().datetime().optional(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
