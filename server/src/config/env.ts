import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file as well as local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  // Database
  USE_PGLITE: z.enum(['true', 'false']).default('true'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('gms_user'),
  DB_PASSWORD: z.string().default('gms_password'),
  DB_NAME: z.string().default('gms_db'),
  DATABASE_URL: z.string().default('postgresql://gms_user:gms_password@localhost:5432/gms_db'),

  // Server
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Auth
  JWT_SECRET: z.string().min(16).default('dev-jwt-secret-change-in-production-abc123xyz'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-change-in-production-def456uvw'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
