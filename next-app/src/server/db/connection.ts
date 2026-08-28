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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite");
    const dataDir = process.env.PGLITE_DATA_DIR
      ? path.resolve(/* turbopackIgnore: true */ process.env.PGLITE_DATA_DIR)
      : path.join(process.cwd(), ".pglite");
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres");
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
    })();
  }
  await globalForDb.dbSetup;
}

export type Database = typeof db;