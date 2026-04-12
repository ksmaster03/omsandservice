import { z } from 'zod';
import { BRANDS } from '../constants';
import { listQuerySchema } from './pagination';

export const createProductSchema = z.object({
  sku: z.string().min(2).max(50).regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric with dashes'),
  wmsPartNo: z.string().max(50).optional(),
  brand: z.enum(BRANDS),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  partType: z.string().max(50).optional(),
  uom: z.string().max(10).default('EA'),
  standardPack: z.number().int().min(1).optional(),
  price: z.number().nonnegative().max(99999999),
  warrantyMonths: z.number().int().min(0).max(120).default(24),
  pmIntervalMonths: z.number().int().min(1).max(24).default(3),
  active: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productListQuerySchema = listQuerySchema.extend({
  brand: z.enum(BRANDS).optional(),
  category: z.string().max(50).optional(),
  active: z.coerce.boolean().optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
