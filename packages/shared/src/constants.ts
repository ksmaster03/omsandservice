/**
 * Shared constants — mirror the locked product decisions.
 * Runtime values (like limits) should be read from the Setting table
 * via the API, but these defaults are the source of truth on first boot.
 */

export const USER_ROLES = ['SALES', 'INSTALL', 'SERVICE', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BRANDS = ['MAXNUM', 'GORILLA_TECK', 'ANYFIT', 'IMPULSE'] as const;
export type Brand = (typeof BRANDS)[number];

export const LEAD_STAGES = [
  'LEAD',
  'QUALIFIED',
  'DEMO',
  'QUOTE',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const TICKET_STAGES = [
  'RECEIVED',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'REPAIRING',
  'CLOSED',
  'CANCELLED',
] as const;
export type TicketStage = (typeof TICKET_STAGES)[number];

export const PRIORITIES = ['URGENT', 'NORMAL', 'LOW'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROBLEM_TYPES = ['BELT', 'NOISE', 'CONSOLE', 'MOTOR', 'POWER', 'PM', 'OTHER'] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

/** Default Settings seed values (written to DB on first boot) */
export const DEFAULT_SETTINGS = {
  gps_interval_seconds: 30,
  gps_tracking_expiry_minutes: 5,
  ticket_sla_urgent_hours: 4,
  ticket_sla_normal_hours: 24,
  ticket_sla_low_hours: 72,
  photo_max_count: 5,
  photo_max_size_mb: 20,
  video_max_count: 1,
  video_max_size_mb: 50,
  pm_reminder_days_before: 7,
  warranty_reminder_days: '60,30,7',
  quote_validity_days: 30,
} as const;

/** Brand colors from nbasport.co.th CSS */
export const BRAND_COLORS = {
  red: '#FF2720',
  redDark: '#D90008',
  redLight: '#FFEBEA',
  gold: '#FFCE00',
  goldText: '#A87800',
  goldLight: '#FFF6CC',
  navy: '#0C1016',
  navy2: '#141718',
} as const;

/** JWT expirations */
export const JWT_ACCESS_TTL = '15m';
export const JWT_REFRESH_TTL = '7d';
