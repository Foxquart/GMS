import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { db } from "@/server/db/connection";
import { jobs } from "@/server/db/schema";
import { createPart, getLowStock, stockIn } from "@/server/services/inventory.service";
import { createJob } from "@/server/services/job.service";
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

  it("counts low stock the same way the low-stock page does", async () => {
    // These three numbers used to come from two different queries: the
    // dashboard looked at the shop floor only, while /inventory/low-stock and
    // the nav badge looked at both locations. Same question, different
    // answers, depending which screen you were on.
    //
    // This part is stocked on the floor but empty in the back, so it counts
    // only if warehouse minimums are being honoured.
    const part = await createPart({
      name: "Warehouse short only",
      minimumShopStock: 0,
      minimumWarehouseStock: 5,
    });
    await stockIn({ partId: part.id, locationCode: "SHOP", quantity: 10 });

    const { summary, lowStock } = await getDashboard();
    const page = await getLowStock();

    expect(summary.lowStockCount).toBe(page.length);
    expect(summary.warehouseOnlyCount).toBe(1);
    // Listed rows stay shop-short only: a warehouse shortage is a re-order,
    // not something that stops a job today.
    expect(lowStock.some((r: any) => r.id === part.id)).toBe(false);
  });

  it("lists the oldest open jobs first, with their age", async () => {
    // Newest-first meant that past ten open jobs the list showed the ten just
    // written and dropped the ones that had been sitting for weeks.
    const { customer } = await seedCustomerAndPart(10);
    const old = await createJob({ customerId: customer.id, vehicleType: "CAR", complaint: "Old" });
    await createJob({ customerId: customer.id, vehicleType: "CAR", complaint: "New" });

    const twelveDaysAgo = new Date();
    twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
    await db.update(jobs).set({ createdAt: twelveDaysAgo }).where(eq(jobs.id, old.id));

    const { activeJobs, summary } = await getDashboard();

    expect(activeJobs[0].id).toBe(old.id);
    expect(activeJobs[0].ageDays).toBe(12);
    expect(summary.staleJobs).toBe(1);
  });

  it("totals stock across both locations", async () => {
    await seedCustomerAndPart(10);

    const { summary } = await getDashboard();

    // The merged tile prints this total, so it has to be exactly the two
    // halves it shows underneath — not a separately derived figure.
    expect(summary.stockValue).toBe(summary.shopStockValue + summary.warehouseStockValue);
    expect(summary.stockUnits).toBe(summary.shopUnits + summary.warehouseUnits);
  });

  it("reports zeroes when there is no stock at all", async () => {
    const { summary } = await getDashboard();
    expect(summary.shopUnits).toBe(0);
    expect(summary.warehouseUnits).toBe(0);
    expect(summary.stockPurchased).toBe(0);
  });
});
