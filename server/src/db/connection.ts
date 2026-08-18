import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usePglite = process.env.USE_PGLITE === 'true' || process.env.DATABASE_URL?.startsWith('pglite://');

let dbInstance: any;
let poolInstance: any = null;

if (usePglite) {
  const dataDir = path.resolve(__dirname, '../../../pgdata_store');
  const client = new PGlite(dataDir);
  dbInstance = drizzlePglite(client, { schema });
  console.log(`📦 Using embedded PostgreSQL (PGlite) storing at ${dataDir}`);
} else {
  const { Pool } = pg;
  poolInstance = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  poolInstance.on('error', (err: any) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  dbInstance = drizzlePg(poolInstance, { schema });
}

export const db = dbInstance;
export const pool = poolInstance;
export type Database = typeof db;
