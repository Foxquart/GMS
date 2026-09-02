import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { db } from "@/server/db/connection";
import { invoices, jobs, payments, stockMovements } from "@/server/db/schema";
import { createJob, saveJobPart } from "@/server/services/job.service";
import { completeJob } from "@/server/services/invoice.service";
import { getPartsUsage, getReport } from "@/server/services/report.service";
import { parseRange, resolveMonth } from "@/lib/date-range";

/**
 * Period boundaries, against the database.
 *
 * `date-range.test.ts` proves the arithmetic; this proves the SQL agrees with
 * it. Nothing covered this before — every existing report test asked for
 * "today" on data seeded seconds earlier, so both ends of the window were
 * exercised only by rows sitting comfortably in the middle of it.
 */
const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0, ms = 0) =>
  new Date(y, m, d, h, mi, s, ms);

/** An invoice for `total`, stamped at an exact moment. */
async function invoiceAt(when: Date, total: number, suffix: string) {
  const { customer } = await seedCustomerAndPart(0);
  const [job] = await db
    .insert(jobs)
    .values({ jobNumber: `JOB-R-${suffix}`, customerId: customer.id, status: "COMPLETED" })
    .returning();
  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber: `INV-R-${suffix}`,
      jobId: job.id,
      customerId: customer.id,
      subtotal: String(total),
      total: String(total),
      dueAmount: String(total),
      createdAt: when,
    })
    .returning();
  return { invoice, customer, job };
}

describe("report windows", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("includes the last instant of the range and excludes the next", async () => {
    const august = resolveMonth(2026, 7);

    // One second before midnight on 31 August — inside.
    await invoiceAt(at(2026, 7, 31, 23, 59, 59), 1000, "in-last");
    // Midnight on 1 September — outside, by one second.
    await invoiceAt(at(2026, 8, 1, 0, 0, 0), 9999, "out-next");
    // Midnight on 1 August — inside, the first instant of the range.
    await invoiceAt(at(2026, 7, 1, 0, 0, 0), 500, "in-first");
    // One second before that — outside.
    await invoiceAt(at(2026, 6, 31, 23, 59, 59), 8888, "out-prev");

    const report = await getReport(august);

    expect(report.billed).toBe(1500);
    expect(report.invoicesCount).toBe(2);
  });

  it("moves with the window instead of reporting everything since a start", async () => {
    await invoiceAt(at(2026, 5, 15, 12), 700, "june");
    await invoiceAt(at(2026, 6, 15, 12), 300, "july");

    const june = await getReport(resolveMonth(2026, 5));
    const july = await getReport(resolveMonth(2026, 6));
    const both = await getReport(parseRange("2026-06-01", "2026-07-31")!);

    // The old open-ended window would have reported 1000 for June, because it
    // had no upper bound at all.
    expect(june.billed).toBe(700);
    expect(july.billed).toBe(300);
    expect(both.billed).toBe(1000);
  });

  it("bounds payments and new customers by the same window", async () => {
    const { invoice, customer } = await invoiceAt(at(2026, 7, 10, 10), 1000, "pay");
    await db.insert(payments).values([
      {
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: "400",
        paymentMethod: "CASH",
        createdAt: at(2026, 7, 10, 11),
      },
      // Paid in September, against an August invoice — collected in September.
      {
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: "600",
        paymentMethod: "CASH",
        createdAt: at(2026, 8, 2, 11),
      },
    ]);

    const august = await getReport(resolveMonth(2026, 7));
    const september = await getReport(resolveMonth(2026, 8));

    expect(august.billed).toBe(1000);
    expect(august.collected).toBe(400);
    expect(september.billed).toBe(0);
    expect(september.collected).toBe(600);
  });

  it("keeps outstanding out of the window entirely", async () => {
    await invoiceAt(at(2026, 5, 15, 12), 700, "old-debt");

    const june = await getReport(resolveMonth(2026, 5));
    const december = await getReport(resolveMonth(2026, 11));

    // Money owed does not stop being owed because the report moved to a month
    // in which nothing happened. It is a snapshot, and it is filed as one.
    expect(june.snapshot.outstanding).toBe(700);
    expect(december.snapshot.outstanding).toBe(700);
    expect(december.billed).toBe(0);
  });

  it("keeps parts usage and the report's own parts count in step", async () => {
    const { customer, part } = await seedCustomerAndPart(20);

    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity: 4 });
    await completeJob({ jobId: job.id });

    // Back-date the ledger rows out of range. Both queries inside
    // getPartsUsage read stock_movements.created_at, so if the two predicates
    // ever drift apart this is what catches it.
    await db
      .update(stockMovements)
      .set({ createdAt: at(2026, 7, 12, 9) })
      .where(eq(stockMovements.partId, part.id));

    const august = resolveMonth(2026, 7);
    const september = resolveMonth(2026, 8);

    const [augUsage, augReport] = await Promise.all([
      getPartsUsage(august),
      getReport(august),
    ]);
    expect(augUsage.totals.quantity).toBe(4);
    expect(augUsage.totals.quantity).toBe(augReport.partsConsumed);
    // The charged column is scoped through the same movement rows, so it must
    // appear in the same window and not in the other one.
    expect(augUsage.totals.charged).toBeGreaterThan(0);

    const sepUsage = await getPartsUsage(september);
    expect(sepUsage.totals.quantity).toBe(0);
    expect(sepUsage.totals.charged).toBe(0);
    expect(sepUsage.rows).toHaveLength(0);
  });

  it("reports a single day as a range", async () => {
    await invoiceAt(at(2026, 7, 10, 8), 200, "day-in");
    await invoiceAt(at(2026, 7, 11, 8), 900, "day-out");

    const oneDay = await getReport(parseRange("2026-08-10", "2026-08-10")!);
    expect(oneDay.billed).toBe(200);
  });
});
