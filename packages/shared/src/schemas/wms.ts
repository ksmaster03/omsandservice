import { z } from 'zod';

/** WMS stock query response — what our adapter normalizes from upstream */
export const wmsStockSchema = z.object({
  sku: z.string(),
  warehouse: z.string(),
  qty: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type WmsStock = z.infer<typeof wmsStockSchema>;

/** Order push payload — what we send to WMS when a SO is confirmed */
export const wmsOrderPushSchema = z.object({
  soNo: z.string(),
  customerName: z.string(),
  items: z.array(
    z.object({
      sku: z.string(),
      qty: z.number().int().positive(),
    }),
  ),
  shippingAddress: z.string().optional(),
});
export type WmsOrderPush = z.infer<typeof wmsOrderPushSchema>;

export const wmsSyncLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'RETRY']).optional(),
});
export type WmsSyncLogListQuery = z.infer<typeof wmsSyncLogListQuerySchema>;
