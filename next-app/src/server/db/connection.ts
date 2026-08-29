import { scryptSync, randomBytes } from "node:crypto";
import path from "path";
import fs from "fs";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const usePglite =
  (process.env.USE_PGLITE ?? "true") === "true" ||
  !process.env.DATABASE_URL;

// Global singleton so Next.js dev/hot-reload reuses the same embedded DB.
const globalForDb = globalThis as unknown as {
  db?: any;
  dbSetup?: Promise<void>;
  dbReady?: Promise<void>;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // EPERM means the process exists but belongs to another user.
    return err?.code === "EPERM";
  }
}

/**
 * `postmaster.pid` is Postgres's exclusive-access lock, and it is the only
 * thing standing between two processes and a corrupted data directory.
 *
 * This used to be deleted unconditionally on every startup. That let a second
 * server, a seed script or a test run open the directory while the first
 * still held it, each believing it had exclusive access — which is what
 * produced the repeated `RuntimeError: Aborted()` corruption. The lock is now
 * only cleared when the process that wrote it is genuinely gone.
 */
function clearStaleLock(dataDir: string) {
  const lockFile = path.join(dataDir, "postmaster.pid");
  if (!fs.existsSync(lockFile)) return;

  let pid = NaN;
  try {
    pid = Number.parseInt(fs.readFileSync(lockFile, "utf8").split("\n")[0]?.trim() ?? "", 10);
  } catch {
    // Unreadable lock file — fall through and treat it as stale.
  }

  if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && isProcessAlive(pid)) {
    throw new Error(
      `Database directory ${dataDir} is already open by process ${pid}. ` +
        "PGlite is single-process: stop that server (or seed/test run) first. " +
        "Opening the directory twice is what corrupts it.",
    );
  }

  try {
    fs.unlinkSync(lockFile);
  } catch {
    // ignore
  }
}

function createDb() {
  if (usePglite) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite");
    const dataDir = process.env.PGLITE_DATA_DIR
      ? path.resolve(/* turbopackIgnore: true */ process.env.PGLITE_DATA_DIR)
      : path.join(process.cwd(), ".pglite");
    clearStaleLock(dataDir);
    const client = new PGlite(dataDir);
    return drizzlePglite(client, { schema });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres");
  // On serverless every warm instance holds its own pool, so a max of 10 per
  // instance exhausts the database's connection limit long before traffic
  // justifies it — and exhausted pools show up as slow requests, not errors.
  // Keep it small by default; raise DB_POOL_MAX on a long-lived server.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return drizzlePg(pool, { schema });
}

export const db =
  globalForDb.db ??
  (globalForDb.db = createDb());

// ─── Warm-up ─────────────────────────────────────────────────────────
/**
 * Opens the connection and pays the engine's one-time start-up cost before
 * the first request arrives. PGlite boots a WebAssembly Postgres on its first
 * query — ~1.4s locally, against a 1ms steady state — and it is single
 * threaded, so whichever request triggers it blocks every other request
 * behind it.
 */
export async function warmDb() {
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    console.error("DB warm-up failed:", err);
  }
}

/**
 * A missing schema should say so, not surface as a raw "Failed query" from
 * whichever route happened to touch the database first.
 */
async function assertSchemaPresent() {
  const res: any = await db.execute(sql`select to_regclass('public.users') as t`);
  const present = (res.rows ?? res)[0]?.t;
  if (!present) {
    throw new Error(
      "Database schema is missing. Run `npm run db:setup` to migrate and seed it.",
    );
  }
}

/**
 * Resolves once the connection is warm and the schema is present. Next begins
 * accepting requests before `register()` has finished, so without this gate an
 * early request runs against a database that is not ready and dies with a raw
 * "Failed query".
 *
 * It does NOT migrate or seed. Running migrations on every boot meant every
 * server start raced every other one over the same data directory, and made a
 * restart able to rewrite data. Setup is now explicit: `npm run db:setup`.
 *
 * Memoised on globalThis, so every call after the first is an already-resolved
 * promise and costs nothing. On failure the memo is cleared so the next
 * request retries rather than inheriting a permanently rejected promise.
 */
export function dbReady(): Promise<void> {
  if (!globalForDb.dbReady) {
    globalForDb.dbReady = (async () => {
      await warmDb();
      await assertSchemaPresent();
    })().catch((err) => {
      globalForDb.dbReady = undefined;
      throw err;
    });
  }
  return globalForDb.dbReady;
}

// ─── Setup (migrate + seed) ──────────────────────────────────────────
/**
 * Explicit only — invoked by `npm run db:setup` and by the test harness, never
 * on boot. Migrations are a deployment step, not a side effect of starting a
 * server.
 */
export async function ensureDbSetup() {
  if (!globalForDb.dbSetup) {
    globalForDb.dbSetup = (async () => {
      const migrationsFolder = path.resolve(process.cwd(), "drizzle");
      if (usePglite) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { migrate: migratePglite } = require("drizzle-orm/pglite/migrator");
        await migratePglite(db as any, { migrationsFolder });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { migrate: migratePg } = require("drizzle-orm/node-postgres/migrator");
        await migratePg(db as any, { migrationsFolder });
      }

      // Seed admin user.
      const adminEmail = "admin@garage.com";
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, adminEmail))
        .limit(1);
      if (!existingUser) {
        await db.insert(schema.users).values({
          name: "Admin Owner",
          email: adminEmail,
          passwordHash: hashPassword("admin123"),
          role: "SUPERADMIN",
        });
      } else if (existingUser.role.toUpperCase() !== "SUPERADMIN") {
        await db.update(schema.users).set({ role: "SUPERADMIN" }).where(eq(schema.users.id, existingUser.id));
      }

      // Seed superadmin user.
      const superadminEmail = "superadmin@garage.com";
      const [existingSuperadmin] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, superadminEmail))
        .limit(1);
      if (!existingSuperadmin) {
        await db.insert(schema.users).values({
          name: "Platform Superadmin",
          email: superadminEmail,
          passwordHash: hashPassword("superadmin123"),
          role: "SUPERADMIN",
        });
      }

      // Seed inventory locations.
      for (const loc of [
        { name: "Main Shop", code: "SHOP", locationType: "SHOP" },
        { name: "Main Warehouse", code: "WAREHOUSE", locationType: "WAREHOUSE" },
      ]) {
        const [existing] = await db
          .select()
          .from(schema.inventoryLocations)
          .where(eq(schema.inventoryLocations.code, loc.code))
          .limit(1);
        if (!existing) {
          await db.insert(schema.inventoryLocations).values(loc as any);
        }
      }

      // Seed default part categories (only when the table is completely empty,
      // so a deleted default category does not come back on the next boot).
      const { seedDefaultCategories } = await import("../services/category.service");
      await seedDefaultCategories(db);

      // Seed business settings.
      const [existingSettings] = await db.select().from(schema.settings).limit(1);
      if (!existingSettings) {
        await db.insert(schema.settings).values({
          businessName: "Vidya Mechanical Workshop",
          businessPhone: "+91 98765 43210",
          businessAddress: "123 Industrial Area, City",
          invoicePrefix: "INV",
          invoiceTerms:
            "Payment due upon invoice generation. Thank you for your business!",
        });
      }
    })().catch((err) => {
      // Clear the memo so a transient failure (a half-written data dir, a
      // database that was not up yet) is retried instead of being cached as
      // "setup is done" for the life of the process.
      globalForDb.dbSetup = undefined;
      throw err;
    });
  }
  await globalForDb.dbSetup;
}

export type Database = typeof db;