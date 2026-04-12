import { z } from 'zod';
import { listQuerySchema } from './pagination';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  alternateName: z.string().max(200).optional(),
  taxId: z.string().max(20).optional(),
  type: z.enum(['INDIVIDUAL', 'CORPORATE']).default('CORPORATE'),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  alternateAddress: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  active: z.boolean().optional(),
  wmsCode: z.string().max(50).optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerListQuerySchema = listQuerySchema.extend({
  type: z.enum(['INDIVIDUAL', 'CORPORATE']).optional(),
  active: z
    .preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional(),
    )
    .optional(),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
