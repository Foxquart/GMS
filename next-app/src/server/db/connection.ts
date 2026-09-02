import { scryptSync, randomBytes } from "node:crypto";
import path from "path";
import fs from "fs";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const usePglite =
  (process.env.USE_PGLITE ?? "true") === "true" ||
  !process.env.DATABASE_URL;

/**
 * Which engine is actually behind `db`. Callers that report on the database
 * itself need this: the embedded engine and a managed Postgres do not expose
 * the same statistics, and reporting a figure the engine never collected as
 * though it were measured is worse than saying it is unavailable.
 */
export function isPglite() {
  return usePglite;
}

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
 * Takes exclusive ownership of a PGlite data directory for this process.
 *
 * PGlite is a single-process WebAssembly Postgres: two processes opening the
 * same directory corrupt it, which shows up later as
 * `RuntimeError: Aborted()` on every query. Postgres would normally prevent
 * this with `postmaster.pid`, but PGlite writes a placeholder pid of `-42`
 * there — it has no real OS process — so that file can never identify a live
 * holder. This keeps its own lock, named with the actual Node pid.
 *
 * A hard kill leaves the lock behind; that is fine, because ownership is
 * decided by whether the recorded pid is still alive, not by the file's mere
 * existence.
 */
function acquireDataDirLock(dataDir: string) {
  const lockFile = `${dataDir}.lock`;

  if (fs.existsSync(lockFile)) {
    let pid = NaN;
    try {
      pid = Number.parseInt(fs.readFileSync(lockFile, "utf8").trim(), 10);
    } catch {
      // Unreadable lock — treat as stale rather than wedging the app forever.
    }
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && isProcessAlive(pid)) {
      throw new Error(
        `Database directory ${dataDir} is already open by process ${pid}. ` +
          "PGlite allows one process at a time — stop that server, seed or test run first. " +
          "Opening it twice is what corrupts the directory.",
      );
    }
  }

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(lockFile, String(process.pid));

  const release = () => {
    try {
      // Only drop the lock if it is still ours; a later owner's must survive.
      if (fs.readFileSync(lockFile, "utf8").trim() === String(process.pid)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Nothing useful to do while exiting.
    }
  };
  process.once("exit", release);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, () => {
      release();
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }

  // Now that we own the directory, a leftover postmaster.pid can only be from
  // an unclean shutdown, so clearing it is safe.
  try {
    fs.unlinkSync(path.join(dataDir, "postmaster.pid"));
  } catch {
    // Absent is the normal case.
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
    acquireDataDirLock(dataDir);
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

function getDb(): any {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}

/**
 * Lazy on purpose. This used to call `createDb()` at module scope, so merely
 * importing the module opened the data directory — including during
 * `next build`, which imports every route to collect its config. A build is
 * not a database client, and with the directory lock in place that import
 * would fail outright while a server was running.
 */
export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

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
 * The two stock locations the app is built around.
 *
 * Deliberately an exception to "boot does not seed", and worth stating why,
 * because the surrounding rule is a good one.
 *
 * These are not the operator's data — they are constants this codebase
 * hardcodes, and every stock write resolves SHOP or WAREHOUSE by code. There
 * is no way to delete one through the app (no route, no service, no UI), so
 * re-creating a missing row cannot fight anybody's deliberate deletion. That
 * is exactly the concern that keeps the *category* defaults out of the boot
 * path — a deleted default category must stay deleted — and it simply does not
 * apply here.
 *
 * Without this, a database with schema but no seed data looks perfectly
 * healthy: every list, the dashboard and every read work. The first write that
 * touches stock — usually saving a part with opening quantities, the first
 * thing a new workshop does — is where it surfaces, as a failure a long way
 * from its cause.
 *
 * `onConflictDoNothing` on the unique `code` makes it safe for two cold starts
 * to race, which on serverless they will.
 */
async function ensureStockLocations() {
  await db
    .insert(schema.inventoryLocations)
    .values([
      { name: "Main Shop", code: "SHOP", locationType: "SHOP" },
      { name: "Main Warehouse", code: "WAREHOUSE", locationType: "WAREHOUSE" },
    ] as any)
    .onConflictDoNothing({ target: schema.inventoryLocations.code });
}

/**
 * Resolves once the connection is warm and the schema is present. Next begins
 * accepting requests before `register()` has finished, so without this gate an
 * early request runs against a database that is not ready and dies with a raw
 * "Failed query".
 *
 * It does NOT migrate, and it does not seed anything the operator owns.
 * Running migrations on every boot meant every server start raced every other
 * one over the same data directory, and made a restart able to rewrite data.
 * Setup is explicit: `npm run db:setup`.
 *
 * The one exception is the two stock locations — see `ensureStockLocations`
 * for why those are the app's constants rather than the operator's data, and
 * why leaving them to explicit setup produced a 503 on the first stock write
 * of every incompletely-set-up database.
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
      await ensureStockLocations();
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
      // The workshop owner, and an ADMIN — matching seed.ts, which has always
      // created this account with that role. Setup used to insert it as
      // SUPERADMIN and then re-assert that on every run, so a deliberate
      // demotion was undone the next time anyone ran `npm run db:setup`.
      // Roles are changed through the Admins screen; setup only fills in what
      // is missing.
      if (!existingUser) {
        await db.insert(schema.users).values({
          name: "Admin Owner",
          email: adminEmail,
          passwordHash: hashPassword("admin123"),
          role: "ADMIN",
        });
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