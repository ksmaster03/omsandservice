import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  CORS_ORIGINS: z.string().default('http://localhost:4110,http://localhost:4120,http://localhost:4130'),

  // Rate limit: max requests per time window (per IP). Set to 0 to disable.
  RATE_LIMIT_MAX: z.coerce.number().int().min(0).default(200),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  // LINE (stubbed for Sprint 0)
  LINE_CHANNEL_ID: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),

  // AWS (stubbed for Sprint 0)
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_UPLOAD_BUCKET: z.string().optional(),

  // WMS (stubbed, mock first)
  WMS_BASE_URL: z.string().optional(),
  WMS_API_KEY: z.string().optional(),

  // Google OAuth (ID-token flow via @react-oauth/google popup)
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Toptier WMS real integration
  WMS_USERNAME: z.string().optional(),
  WMS_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
