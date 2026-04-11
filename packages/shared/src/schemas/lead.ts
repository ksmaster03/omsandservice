import { z } from 'zod';
import { LEAD_STAGES } from '../constants';
import { listQuerySchema } from './pagination';

export const createLeadSchema = z.object({
  customerId: z.string().uuid(),
  value: z.number().nonnegative().max(99999999),
  stage: z.enum(LEAD_STAGES).default('LEAD'),
  expectedClose: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema
  .partial()
  .omit({ customerId: true });
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const updateLeadStageSchema = z.object({
  stage: z.enum(LEAD_STAGES),
  note: z.string().max(1000).optional(),
});
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;

export const leadListQuerySchema = listQuerySchema.extend({
  stage: z.enum(LEAD_STAGES).optional(),
  ownerId: z.string().uuid().optional(),
});
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const createDemoSchema = z.object({
  leadId: z.string().uuid(),
  productId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  note: z.string().max(1000).optional(),
});
export type CreateDemoInput = z.infer<typeof createDemoSchema>;

export const updateDemoStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  note: z.string().max(1000).optional(),
});
export type UpdateDemoStatusInput = z.infer<typeof updateDemoStatusSchema>;
