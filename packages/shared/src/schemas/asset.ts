import { z } from 'zod';
import { listQuerySchema } from './pagination';

export const assetListQuerySchema = listQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  warrantyStatus: z.enum(['active', 'expiring', 'expired']).optional(),
});
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;

export const pmListQuerySchema = listQuerySchema.extend({
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'OVERDUE', 'SKIPPED']).optional(),
  upcoming: z.coerce.boolean().optional(),
  techId: z.string().uuid().optional(),
});
export type PmListQuery = z.infer<typeof pmListQuerySchema>;

export const completePmSchema = z.object({
  note: z.string().max(2000).optional(),
});
export type CompletePmInput = z.infer<typeof completePmSchema>;

/** Warranty status derived from asset.warrantyEnd vs today */
export function warrantyStatus(
  warrantyEnd: Date,
  now = new Date(),
): 'active' | 'expiring' | 'expired' {
  const ms = warrantyEnd.getTime() - now.getTime();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring';
  return 'active';
}

export function daysUntil(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
