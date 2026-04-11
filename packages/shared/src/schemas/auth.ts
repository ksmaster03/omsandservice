import { z } from 'zod';
import { USER_ROLES } from '../constants';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20).optional(),
  role: z.enum(USER_ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const lineLoginSchema = z.object({
  idToken: z.string().min(1),
});
export type LineLoginInput = z.infer<typeof lineLoginSchema>;
