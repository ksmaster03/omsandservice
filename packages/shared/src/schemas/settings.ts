import { z } from 'zod';

/**
 * Settings are stored as key/value strings in the DB.
 * This schema validates the known keys with proper types.
 */
export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(1000),
});
export type SettingInput = z.infer<typeof settingSchema>;

export const updateSettingsSchema = z.record(z.string(), z.string());
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
