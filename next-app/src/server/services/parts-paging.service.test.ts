import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData } from "@/test/helpers";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { inventoryBalances, inventoryLocations, parts } from "@/server/db/schema";
import {
  createCategory,
} from "@/server/services/category.service";
import { getStockTotals, listParts } from "@/server/services/inventory.service";

/** Puts `qty` of `partId` at one location, the way a seeded balance would. */
async function place(partId: string, code: "SHOP" | "WAREHOUSE", qty: number) {
  const [loc] = await db
    .select()
    .from(inventoryLocations)
    .where(eq(inventoryLocations.code, code))
    .limit(1);
  await db.insert(inventoryBalances).values({ partId, locationId: loc.id, quantity: qty });
}

describe("parts paging and stock totals", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("pages through the whole catalogue instead of truncating it", async () => {
    // 30 parts named so alphabetical order is predictable: Part 01 … Part 30.
    for (let i = 1; i <= 30; i++) {
      await db.insert(parts).values({
        name: `Part ${String(i).padStart(2, "0")}`,
        sellingPrice: String(i * 10),
      });
    }

    const first = await listParts({ pageSize: 10, page: 1 });
    expect(first.total).toBe(30);
    expect(first.pageCount).toBe(3);
    expect(first.rows).toHaveLength(10);
    expect(first.rows[0].name).toBe("Part 01");

    const last = await listParts({ pageSize: 10, page: 3 });
    expect(last.rows).toHaveLength(10);
    expect(last.rows[9].name).toBe("Part 30");

    // Every row appears exactly once across the pages — the property that
    // makes paging trustworthy at all.
    const seen = new Set<string>();
    for (const page of [1, 2, 3]) {
      const { rows } = await listParts({ pageSize: 10, page });
      for (const r of rows) seen.add(r.id);
    }
    expect(seen.size).toBe(30);
  });

  it("sorts across the whole catalogue, not just the first page", async () => {
    // The expensive part sorts LAST by name, so a client-side sort over a
    // truncated first page could never find it. This is the bug the move to
    // server-side ordering exists to fix.
    for (let i = 1; i <= 30; i++) {
      await db.insert(parts).values({
        name: `Part ${String(i).padStart(2, "0")}`,
        sellingPrice: i === 30 ? "1" : "500",
      });
    }

    const { rows } = await listParts({ sort: "PRICE_ASC", pageSize: 5, page: 1 });
    expect(rows[0].name).toBe("Part 30");
    expect(Number(rows[0].sellingPrice)).toBe(1);
  });

  it("orders by each location independently", async () => {
    const [a] = await db.insert(parts).values({ name: "Alpha" }).returning();
    const [b] = await db.insert(parts).values({ name: "Bravo" }).returning();

    // Deliberately opposite: Alpha is empty in the shop but full in the back.
    await place(a.id, "SHOP", 0);
    await place(a.id, "WAREHOUSE", 90);
    await place(b.id, "SHOP", 5);
    await place(b.id, "WAREHOUSE", 1);

    const byShop = await listParts({ sort: "SHOP_ASC" });
    const byWarehouse = await listParts({ sort: "WAREHOUSE_ASC" });

    // The two sorts must disagree — that is the point of naming the location
    // in the sort rather than reading it off a lens elsewhere on the page.
    expect(byShop.rows.map((r: any) => r.name)).toEqual(["Alpha", "Bravo"]);
    expect(byWarehouse.rows.map((r: any) => r.name)).toEqual(["Bravo", "Alpha"]);
  });

  it("clamps a page past the end back to the last real page", async () => {
    for (let i = 1; i <= 5; i++) {
      await db.insert(parts).values({ name: `Part ${i}` });
    }
    const result = await listParts({ pageSize: 2, page: 99 });
    expect(result.page).toBe(3);
    expect(result.rows).toHaveLength(1);
  });

  it("filters low and out per location, and keeps them disjoint", async () => {
    const [low] = await db
      .insert(parts)
      .values({ name: "Low in shop", minimumShopStock: 10, minimumWarehouseStock: 0 })
      .returning();
    const [out] = await db
      .insert(parts)
      .values({ name: "Out in shop", minimumShopStock: 10, minimumWarehouseStock: 0 })
      .returning();
    const [fine] = await db
      .insert(parts)
      .values({ name: "Plenty", minimumShopStock: 1, minimumWarehouseStock: 0 })
      .returning();

    await place(low.id, "SHOP", 3);
    await place(out.id, "SHOP", 0);
    await place(fine.id, "SHOP", 50);

    const lowRows = await listParts({ stock: "LOW", location: "SHOP" });
    const outRows = await listParts({ stock: "OUT", location: "SHOP" });

    expect(lowRows.rows.map((r: any) => r.name)).toEqual(["Low in shop"]);
    expect(outRows.rows.map((r: any) => r.name)).toEqual(["Out in shop"]);
    // Disjoint: an empty shelf is Out, never also Low.
    expect(lowRows.total + outRows.total).toBe(2);

    // BELOW is the union, and must equal what the tile counts — otherwise
    // tapping "2 below minimum" would return a different number of rows.
    const belowRows = await listParts({ stock: "BELOW", location: "SHOP" });
    const totals = await getStockTotals();
    expect(belowRows.total).toBe(2);
    expect(belowRows.total).toBe(totals.shop.belowMin);
  });

  it("totals units and below-minimum counts per location over everything", async () => {
    const category = await createCategory({ name: "Lights" });

    const [a] = await db
      .insert(parts)
      .values({
        name: "Back lamp",
        categoryId: category.id,
        minimumShopStock: 10,
        minimumWarehouseStock: 5,
      })
      .returning();
    const [b] = await db
      .insert(parts)
      .values({ name: "Loose bolt", minimumShopStock: 100, minimumWarehouseStock: 0 })
      .returning();

    await place(a.id, "SHOP", 4); // under its shop minimum of 10
    await place(a.id, "WAREHOUSE", 40); // comfortably over its warehouse minimum
    await place(b.id, "SHOP", 6); // under its shop minimum of 100

    const all = await getStockTotals();
    expect(all.shop.units).toBe(10);
    expect(all.warehouse.units).toBe(40);
    expect(all.shop.belowMin).toBe(2);
    expect(all.warehouse.belowMin).toBe(0);

    // Scoped to a category, both figures narrow with it.
    const lights = await getStockTotals({ categoryId: category.id });
    expect(lights.shop.units).toBe(4);
    expect(lights.warehouse.units).toBe(40);
    expect(lights.shop.belowMin).toBe(1);
  });

  it("counts every part, not just one page of them", async () => {
    // The regression guard: totals must never inherit the list's page size.
    for (let i = 0; i < 40; i++) {
      const [p] = await db
        .insert(parts)
        .values({ name: `Bulk ${i}`, minimumShopStock: 0, minimumWarehouseStock: 0 })
        .returning();
      await place(p.id, "SHOP", 2);
    }

    const page = await listParts({ pageSize: 10, page: 1 });
    const totals = await getStockTotals();

    expect(page.rows).toHaveLength(10);
    expect(page.total).toBe(40);
    expect(totals.shop.units).toBe(80);
  });
});
