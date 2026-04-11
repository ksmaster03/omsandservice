import { z } from 'zod';
import { listQuerySchema } from './pagination';

const INSTALL_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const assignInstallSchema = z.object({
  techId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional(),
});
export type AssignInstallInput = z.infer<typeof assignInstallSchema>;

/**
 * Complete install — triggers Asset creation, warranty calc, and first PM scheduling.
 * Client sends 1 serialNo per quantity item. For simplicity Sprint 3 assumes
 * qty=1 per SO line; multi-unit SOs can be handled in Sprint 4.
 */
export const completeInstallSchema = z.object({
  note: z.string().max(2000).optional(),
  locationDetail: z.string().max(500).optional(),
  assets: z
    .array(
      z.object({
        soItemId: z.string().uuid(),
        serialNo: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(100),
});
export type CompleteInstallInput = z.infer<typeof completeInstallSchema>;

export const installListQuerySchema = listQuerySchema.extend({
  status: z.enum(INSTALL_STATUSES).optional(),
  techId: z.string().uuid().optional(),
});
export type InstallListQuery = z.infer<typeof installListQuerySchema>;

export const scheduleInstallSchema = z.object({
  soId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  techId: z.string().uuid().optional(),
});
export type ScheduleInstallInput = z.infer<typeof scheduleInstallSchema>;
