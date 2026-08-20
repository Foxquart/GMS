import { scryptSync, randomBytes } from "node:crypto";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function bootstrap() {
  const dataDir = path.resolve(process.cwd(), ".pglite");
  const client = new PGlite(dataDir);

  // Apply the drizzle migration (CREATE TABLE IF NOT EXISTS...).
  await migrate(drizzlePglite(client, { schema }), {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });

  const db = drizzlePglite(client, { schema });

  // ─── Seed admin user ───────────────────────────────────────────────
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
    console.log("✅ Admin user created (admin@garage.com / admin123)");
  }

  // ─── Seed inventory locations ──────────────────────────────────────
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
      console.log(`✅ Inventory location created (${loc.code})`);
    }
  }

  // ─── Seed business settings ────────────────────────────────────────
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
    console.log("✅ Default business settings created");
  }

  await client.close();
}

export async function runMigrationsOnly() {
  const dataDir = path.resolve(process.cwd(), ".pglite");
  const client = new PGlite(dataDir);
  await migrate(drizzlePglite(client, { schema }), {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
  await client.close();
}

// Allow running directly: npx tsx src/server/db/seed.ts
if (require.main === module) {
  bootstrap()
    .then(() => {
      console.log("🎉 Setup complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Setup failed:", err);
      process.exit(1);
    });
}