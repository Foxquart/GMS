import { beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { ensureDbSetup, db } from "@/server/db/connection";
import * as schema from "@/server/db/schema";

beforeAll(async () => {
  await ensureDbSetup();
});

// Wipes business data between tests (keeps admin/locations/settings).
export async function resetBusinessData() {
  for (const table of [
    "stock_movements",
    "stock_transfer_items",
    "stock_transfers",
    "invoice_items",
    "payments",
    "invoices",
    "job_labour",
    "job_parts",
    "jobs",
    "vehicles",
    "customers",
    "inventory_balances",
    "parts",
    // After parts (which reference sub-categories), before categories (whose
    // delete cascades into the link table anyway).
    "category_sub_categories",
    "sub_categories",
    "categories",
    "suppliers",
  ]) {
    await db.execute(`delete from ${table}`);
  }
}

// Reusable seed: a customer plus a part with N units in SHOP stock.
export async function seedCustomerAndPart(shopQty = 10) {
  const [customer] = await db
    .insert(schema.customers)
    .values({ name: "Rahul", phone: "9876543210" })
    .returning();

  const [part] = await db
    .insert(schema.parts)
    .values({
      name: "Brake Pad",
      sellingPrice: "450",
      purchasePrice: "250",
      minimumShopStock: 2,
    })
    .returning();

  const [shop] = await db
    .select()
    .from(schema.inventoryLocations)
    .where(eq(schema.inventoryLocations.code, "SHOP"))
    .limit(1);
  const [warehouse] = await db
    .select()
    .from(schema.inventoryLocations)
    .where(eq(schema.inventoryLocations.code, "WAREHOUSE"))
    .limit(1);

  await db.insert(schema.inventoryBalances).values([
    { partId: part.id, locationId: shop.id, quantity: shopQty },
    { partId: part.id, locationId: warehouse.id, quantity: 20 },
  ]);

  return { customer, part, shop, warehouse };
}