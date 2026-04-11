import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  taxId: z.string().max(20).optional(),
  type: z.enum(['INDIVIDUAL', 'CORPORATE']).default('CORPORATE'),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
