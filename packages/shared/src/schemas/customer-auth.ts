import { z } from 'zod';

/**
 * Customer PWA auth schemas.
 *
 * Sprint 5 uses a DEV OTP bypass — any 6-digit code is accepted for any
 * registered phone. When LINE OA credentials are ready, swap the verify
 * endpoint to validate LINE idToken + link to CustomerUser.line_user_id.
 *
 * The JWT returned uses scope='customer' and is separate from staff JWTs.
 */
export const requestOtpSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^[0-9+\- ]+$/, 'Phone must contain digits only'),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6).regex(/^[0-9]{6}$/, 'Code must be 6 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const customerCreateTicketSchema = z.object({
  assetId: z.string().uuid(),
  problemType: z.enum(['BELT', 'NOISE', 'CONSOLE', 'MOTOR', 'POWER', 'OTHER']),
  priority: z.enum(['URGENT', 'NORMAL', 'LOW']),
  description: z.string().min(5).max(2000),
  locationDetail: z.string().max(500).optional(),
  photoKeys: z
    .array(
      z.object({
        s3Key: z.string().max(500),
        size: z.number().int().nonnegative().max(20 * 1024 * 1024),
      }),
    )
    .max(5)
    .default([]),
});
export type CustomerCreateTicketInput = z.infer<typeof customerCreateTicketSchema>;
