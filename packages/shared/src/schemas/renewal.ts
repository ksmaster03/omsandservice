import { z } from 'zod';
import { listQuerySchema } from './pagination';

const RENEWAL_TYPES = ['STANDARD', 'PREMIUM'] as const;
const RENEWAL_STATUSES = ['OFFERED', 'ACCEPTED', 'PAID', 'EXPIRED'] as const;

export const createRenewalOfferSchema = z.object({
  assetId: z.string().uuid(),
  type: z.enum(RENEWAL_TYPES).default('STANDARD'),
  price: z.number().nonnegative().max(99999999),
  extendMonths: z.number().int().positive().max(120).default(12),
});
export type CreateRenewalOfferInput = z.infer<typeof createRenewalOfferSchema>;

export const updateRenewalStatusSchema = z.object({
  status: z.enum(RENEWAL_STATUSES),
});
export type UpdateRenewalStatusInput = z.infer<typeof updateRenewalStatusSchema>;

export const renewalListQuerySchema = listQuerySchema.extend({
  status: z.enum(RENEWAL_STATUSES).optional(),
  assetId: z.string().uuid().optional(),
});
export type RenewalListQuery = z.infer<typeof renewalListQuerySchema>;

/**
 * Suggest a renewal price. Very rough MVP rule:
 *   Standard = 8% of product price per year
 *   Premium  = 15% of product price per year (includes parts)
 */
export function suggestRenewalPrice(
  productPrice: number,
  type: 'STANDARD' | 'PREMIUM' = 'STANDARD',
  months = 12,
): number {
  const annualRate = type === 'PREMIUM' ? 0.15 : 0.08;
  const price = productPrice * annualRate * (months / 12);
  return Math.round(price / 100) * 100; // round to nearest 100 THB
}
