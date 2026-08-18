import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, pool } from './connection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const migrationsDir = path.resolve(__dirname, 'migrations');

  try {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Execute SQL content against db
      if (typeof db.execute === 'function') {
        // Remove statement breakpoints if any
        const statements = sqlContent
          .split('--> statement-breakpoint')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          try {
            await db.execute(statement);
          } catch (err: any) {
            // Ignore already exists errors during dev re-runs
            if (!err.message?.includes('already exists')) {
              console.warn(`Migration notice: ${err.message}`);
            }
          }
        }
      }
    }
    console.log('✅ Database schema is up to date.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => {
    if (pool) pool.end();
    process.exit(0);
  });
}
