import { z } from 'zod';
import { USER_ROLES } from '../constants';
import { listQuerySchema } from './pagination';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const userListQuerySchema = listQuerySchema.extend({
  role: z.enum(USER_ROLES).optional(),
  active: z.coerce.boolean().optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
