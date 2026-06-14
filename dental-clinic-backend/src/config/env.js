import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  UPLOAD_DIR: z.string().default('uploads'),
  // License system configuration
  MASTER_LICENSE_SERVER_URL: z.string().url().optional(),
  LICENSE_GRACE_PERIOD_DAYS: z.coerce.number().int().min(0).default(7),
  LICENSE_BACKGROUND_CHECK_INTERVAL: z.coerce.number().int().min(3600).default(86400), // seconds
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
