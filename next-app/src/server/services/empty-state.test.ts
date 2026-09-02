import { describe, expect, it, beforeAll } from "vitest";
import { db, dbReady } from "@/server/db/connection";
import { resetBusinessData } from "@/test/helpers";
import {
  getLowStock,
  getPartBalance,
  listMovements,
  listParts,
  listSuppliers,
  listTransfers,
  stockIn,
} from "@/server/services/inventory.service";
import { listJobs } from "@/server/services/job.service";
import { listInvoices } from "@/server/services/invoice.service";
import { listCustomers } from "@/server/services/customer.service";
import { getCustomerOutstanding, getDashboard } from "@/server/services/report.service";

/**
 * A workshop with nothing in it yet is a normal state, not a fault.
 *
 * The bug this guards against: read paths resolved SHOP/WAREHOUSE through a
 * helper that *threw* when the location was missing, so a database whose
 * locations had not been created returned 500 from the low-stock endpoint and
 * the dashboard. "No data" and "the server is broken" are different claims,
 * and the API was making the wrong one.
 *
 * `inventory_locations` is emptied here deliberately — it is the harshest
 * version of empty, and the one that used to break.
 */
describe("empty database", () => {
  beforeAll(async () => {
    await resetBusinessData();
    await db.execute("delete from inventory_balances");
    await db.execute("delete from stock_movements");
    await db.execute("delete from inventory_locations");
  });

  it("answers every list with an empty result rather than an error", async () => {
    expect(await listCustomers({})).toEqual([]);
    expect(await listSuppliers()).toEqual([]);
    expect(await getCustomerOutstanding()).toEqual([]);
    expect(await getLowStock()).toEqual([]);

    expect((await listJobs({})).rows).toEqual([]);
    expect((await listInvoices({})).rows).toEqual([]);
    expect((await listMovements({})).rows).toEqual([]);
    expect((await listTransfers()).rows).toEqual([]);
    expect((await listParts({})).rows).toEqual([]);
  });

  it("reports zero totals rather than failing to build a dashboard", async () => {
    const { summary, lowStock, activeJobs, recentInvoices } = await getDashboard();

    expect(summary.todayBilled).toBe(0);
    expect(summary.outstanding).toBe(0);
    expect(summary.stockValue).toBe(0);
    expect(summary.stockUnits).toBe(0);
    expect(summary.lowStockCount).toBe(0);
    expect(lowStock).toEqual([]);
    expect(activeJobs).toEqual([]);
    expect(recentInvoices).toEqual([]);
  });

  it("treats a filter on a location that does not exist as matching nothing", async () => {
    const byLocation = await listMovements({ locationCode: "SHOP" });
    expect(byLocation.rows).toEqual([]);
    expect(byLocation.total).toBe(0);
  });

  it("reads a balance at a missing location as zero", async () => {
    expect(await getPartBalance("00000000-0000-0000-0000-000000000001", "SHOP")).toBe(0);
  });

  it("still refuses to WRITE stock into a location that does not exist", async () => {
    // The counterpart to all of the above. A read has a correct empty answer;
    // a write does not — booking stock into a location that is not there must
    // fail rather than silently appear to have worked.
    await expect(
      stockIn({
        partId: "00000000-0000-0000-0000-000000000001",
        locationCode: "SHOP",
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      // A named failure the person can act on, not a generic 500 with a
      // reference code. 503 because the request is fine and would succeed
      // once the database is set up.
      status: 503,
      code: "LOCATIONS_MISSING",
    });
  });

  it("re-creates the stock locations on the next boot", async () => {
    // The counterpart to the test above: the 503 is the right answer only
    // until the app next starts. Locations are this codebase's constants, not
    // the operator's data, and nothing in the app can delete one — so a boot
    // that finds them missing puts them back rather than leaving every stock
    // write broken until someone runs a script.
    const missing = await db.execute("select count(*)::int n from inventory_locations");
    expect(Number((missing.rows as any)[0].n)).toBe(0);

    // A fresh process would not have the memo; clear it the same way.
    (globalThis as any).dbReady = undefined;
    await dbReady();

    const healed = await db.execute("select code from inventory_locations order by code");
    expect((healed.rows as any[]).map((r) => r.code)).toEqual(["SHOP", "WAREHOUSE"]);

    // Booting twice must not create a second pair — the unique `code` and
    // onConflictDoNothing are what make a serverless cold-start race safe.
    (globalThis as any).dbReady = undefined;
    await dbReady();
    const again = await db.execute("select count(*)::int n from inventory_locations");
    expect(Number((again.rows as any)[0].n)).toBe(2);
  });
});
