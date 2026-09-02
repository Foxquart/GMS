import { describe, expect, it, beforeEach } from "vitest";
import { resolvePreset } from "@/lib/date-range";
import { eq, ne, and, sql } from "drizzle-orm";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { db } from "@/server/db/connection";
import { parts, stockMovements } from "@/server/db/schema";
import { stockIn, updatePart } from "@/server/services/inventory.service";
import { createJob, saveJobPart } from "@/server/services/job.service";
import { completeJob } from "@/server/services/invoice.service";
import { getDashboard, getPartsUsage } from "@/server/services/report.service";

/**
 * `stock_movements.unit_cost` exists so that cost figures stop moving when a
 * part is re-priced. Every test here is a variation on that one property.
 */
describe("cost snapshot", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("holds what was spent on stock steady when the purchase price changes", async () => {
    const { part } = await seedCustomerAndPart(10);
    await stockIn({ partId: part.id, locationCode: "WAREHOUSE", quantity: 4 });

    const before = (await getDashboard()).summary.stockPurchased;
    expect(before).toBe(4 * 250);

    // The supplier puts the price up. What the workshop already spent did not
    // change, and neither should the figure reporting it.
    await updatePart(part.id, { purchasePrice: "900" });

    expect((await getDashboard()).summary.stockPurchased).toBe(before);
  });

  it("holds the cost of consumed parts steady when the purchase price changes", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE", complaint: "Noise" });
    await saveJobPart(job.id, { partId: part.id, quantity: 2 });
    await completeJob({ jobId: job.id });

    const before = (await getPartsUsage(resolvePreset("today"))).totals.cost;
    expect(before).toBe(2 * 250);

    await updatePart(part.id, { purchasePrice: "900" });

    expect((await getPartsUsage(resolvePreset("today"))).totals.cost).toBe(before);
  });

  it("writes a cost on every movement, from either writer", async () => {
    // Two writers insert into this table — changeStock (inventory.service) and
    // changeBalance (invoice.service). A new one that forgets unit_cost would
    // book stock in at zero and silently read as free, so this asserts the
    // property rather than either call site.
    const { customer, part } = await seedCustomerAndPart(10);
    await stockIn({ partId: part.id, locationCode: "WAREHOUSE", quantity: 4 });
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE", complaint: "Noise" });
    await saveJobPart(job.id, { partId: part.id, quantity: 1 });
    await completeJob({ jobId: job.id });

    const zeroCost = await db
      .select({ id: stockMovements.id, type: stockMovements.movementType })
      .from(stockMovements)
      .innerJoin(parts, eq(parts.id, stockMovements.partId))
      .where(and(sql`${stockMovements.unitCost} = 0`, ne(parts.purchasePrice, "0")));

    expect(zeroCost).toEqual([]);
  });

  it("reports the same cost through getPartsUsage as the ledger holds", async () => {
    // The parts-usage breakdown and any profit figure both sum unit_cost over
    // the same JOB_USAGE rows. If those two ever diverge, one of them is
    // reading the wrong column.
    const { customer, part } = await seedCustomerAndPart(10);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE", complaint: "Noise" });
    await saveJobPart(job.id, { partId: part.id, quantity: 3 });
    await completeJob({ jobId: job.id });

    const [ledger] = await db
      .select({
        cost: sql<string>`coalesce(sum(${stockMovements.quantity} * -1 * ${stockMovements.unitCost}), 0)`,
      })
      .from(stockMovements)
      .where(eq(stockMovements.movementType, "JOB_USAGE"));

    expect((await getPartsUsage(resolvePreset("today"))).totals.cost).toBe(Number(ledger.cost));
  });
});
