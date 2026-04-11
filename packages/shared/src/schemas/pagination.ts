import { z } from 'zod';

/**
 * Standard list query — used by customers/products/users list endpoints.
 * All fields optional; sensible defaults apply.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
