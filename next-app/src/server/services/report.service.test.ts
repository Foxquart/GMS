import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { createPart, stockIn } from "@/server/services/inventory.service";
import { getDashboard } from "@/server/services/report.service";

describe("dashboard stock analytics", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("values stock on hand per location and totals what was spent buying it", async () => {
    // Two parts, each priced at 250, each seeded with 10 in shop and 20 in
    // warehouse — so the per-location figures have to sum across parts.
    await seedCustomerAndPart(10);
    const { part } = await seedCustomerAndPart(10);
    await stockIn({ partId: part.id, locationCode: "WAREHOUSE", quantity: 4 });

    const { summary } = await getDashboard();

    expect(summary.shopUnits).toBe(20);
    expect(summary.shopStockValue).toBe(20 * 250);
    expect(summary.warehouseUnits).toBe(44);
    expect(summary.warehouseStockValue).toBe(44 * 250);
    // Only the booked-in 4 units came through a STOCK_IN movement; the seeded
    // balances were written straight to the ledger.
    expect(summary.stockPurchased).toBe(4 * 250);
  });

  it("counts every low part, not just the ten the dashboard lists", async () => {
    // The lowStock rows are capped at ten because that is all the page shows.
    // The headline count must not inherit that cap — an owner re-ordering
    // against "10 low" when twelve parts are short would under-buy.
    for (let i = 0; i < 12; i++) {
      await createPart({ name: `Short part ${i}`, minimumShopStock: 5 });
    }

    const { summary, lowStock } = await getDashboard();

    expect(lowStock).toHaveLength(10);
    expect(summary.lowStockCount).toBe(12);
  });

  it("reports zeroes when there is no stock at all", async () => {
    const { summary } = await getDashboard();
    expect(summary.shopUnits).toBe(0);
    expect(summary.warehouseUnits).toBe(0);
    expect(summary.stockPurchased).toBe(0);
  });
});
