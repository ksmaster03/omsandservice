import { z } from 'zod';
import { listQuerySchema } from './pagination';

const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

export const quotationItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive().max(9999),
  unitPrice: z.number().nonnegative().max(99999999),
  discount: z.number().nonnegative().max(99999999).default(0),
});
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

export const createQuotationSchema = z.object({
  customerId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  items: z.array(quotationItemSchema).min(1).max(100),
  discount: z.number().nonnegative().max(99999999).default(0),
  vatRate: z.number().min(0).max(30).default(7),
  validDays: z.number().int().positive().max(365).default(30),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const updateQuotationStatusSchema = z.object({
  status: z.enum(QUOTE_STATUSES),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

export const quotationListQuerySchema = listQuerySchema.extend({
  status: z.enum(QUOTE_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});
export type QuotationListQuery = z.infer<typeof quotationListQuerySchema>;

/** Shared VAT/total calculator — used by both API (source of truth) and UI (preview). */
export function computeQuotationTotals(
  items: QuotationItemInput[],
  discount = 0,
  vatRate = 7,
) {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice - it.discount, 0);
  const base = Math.max(0, subtotal - discount);
  const vat = Math.round(base * (vatRate / 100) * 100) / 100;
  const total = Math.round((base + vat) * 100) / 100;
  return { subtotal, discount, vat, total };
}
