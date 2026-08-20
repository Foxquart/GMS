import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { scryptSync, randomBytes } from "node:crypto";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const usePglite =
  (process.env.USE_PGLITE ?? "true") === "true" ||
  !process.env.DATABASE_URL;

// Global singleton so Next.js dev/hot-reload reuses the same embedded DB.
const globalForDb = globalThis as unknown as {
  db?: any;
  dbSetup?: Promise<void>;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function createDb() {
  if (usePglite) {
    const dataDir = path.resolve(
      process.env.PGLITE_DATA_DIR ??
        /* turbopackIgnore: true */ path.resolve(process.cwd(), ".pglite"),
    );
    // Remove a stale postmaster lock left behind when the previous dev
    // server was killed; otherwise PGlite's embedded postgres aborts.
    const lockFile = path.join(dataDir, "postmaster.pid");
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // ignore
      }
    }
    const client = new PGlite(dataDir);
    return drizzlePglite(client, { schema });
  }
  // `pg` is bundled as an external package; keep a sync require for the
  // node-postgres (production) path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
  return drizzlePg(pool, { schema });
}

export const db =
  globalForDb.db ??
  (globalForDb.db = createDb());

// ─── Setup (migrate + seed) ──────────────────────────────────────────
export async function ensureDbSetup() {
  if (!globalForDb.dbSetup) {
    globalForDb.dbSetup = (async () => {
      const migrationsFolder = path.resolve(process.cwd(), "drizzle");
      if (usePglite) {
        await migratePglite(db as any, { migrationsFolder });
      } else {
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
          role: "admin",
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
    })();
  }
  await globalForDb.dbSetup;
}

export type Database = typeof db;