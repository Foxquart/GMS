import { describe, expect, it, beforeEach } from "vitest";
import { resolvePreset } from "@/lib/date-range";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { createJob, saveJobPart } from "@/server/services/job.service";
import { completeJob } from "@/server/services/invoice.service";
import { getLowStock } from "@/server/services/inventory.service";
import { getPartUsage, getPartsUsage, getReport } from "@/server/services/report.service";

describe("parts usage", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  /** A job that consumes `quantity` of `partId`, completed. */
  async function useOnCompletedJob(customerId: string, partId: string, quantity: number) {
    const job = await createJob({ customerId, vehicleType: "BIKE", complaint: "Service" });
    await saveJobPart(job.id, { partId, quantity });
    return completeJob({ jobId: job.id });
  }

  it("groups consumption by part, priced both ways", async () => {
    // Two jobs completed back to back, which lands them inside the same
    // second — the case that used to drop the later one's charged figure when
    // the window was re-derived from jobs.completedAt.
    //
    // seedCustomerAndPart makes a part at purchase 250 / selling 450.
    const { customer, part } = await seedCustomerAndPart(10);
    await useOnCompletedJob(customer.id, part.id, 2);
    await useOnCompletedJob(customer.id, part.id, 1);

    const usage = await getPartsUsage(resolvePreset("today"));

    expect(usage.rows).toHaveLength(1);
    expect(usage.rows[0].partId).toBe(part.id);
    expect(usage.rows[0].quantity).toBe(3);
    // Cost is what the units were worth out of inventory...
    expect(usage.rows[0].cost).toBe(3 * 250);
    // ...charged is what the customer paid. They must not be the same number.
    expect(usage.rows[0].charged).toBe(3 * 450);
  });

  it("agrees with the partsConsumed total the report already printed", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    const second = await seedCustomerAndPart(10);
    await useOnCompletedJob(customer.id, part.id, 2);
    await useOnCompletedJob(customer.id, second.part.id, 4);

    const [usage, report] = await Promise.all([getPartsUsage(resolvePreset("today")), getReport(resolvePreset("today"))]);

    expect(usage.totals.quantity).toBe(6);
    expect(usage.totals.distinctParts).toBe(2);
    // The breakdown is built on the same JOB_USAGE rows the total sums, so
    // these can never drift apart on screen.
    expect(usage.totals.quantity).toBe(report.partsConsumed);
  });

  it("ignores parts on a job that is still open", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity: 5 });

    // Nothing has left the shelf, so nothing is reported used.
    const usage = await getPartsUsage(resolvePreset("today"));
    expect(usage.rows).toHaveLength(0);
    expect(usage.totals.quantity).toBe(0);

    await completeJob({ jobId: job.id });

    const after = await getPartsUsage(resolvePreset("today"));
    expect(after.totals.quantity).toBe(5);
  });

  it("reports true totals even when the row list is trimmed", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    const second = await seedCustomerAndPart(10);
    await useOnCompletedJob(customer.id, part.id, 2);
    await useOnCompletedJob(customer.id, second.part.id, 4);

    const usage = await getPartsUsage(resolvePreset("today"), { limit: 1 });

    expect(usage.rows).toHaveLength(1);
    // Busiest part first, and the totals still cover both.
    expect(usage.rows[0].quantity).toBe(4);
    expect(usage.totals.quantity).toBe(6);
    expect(usage.totals.distinctParts).toBe(2);
  });

  it("summarises one part's usage across the three windows", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    await useOnCompletedJob(customer.id, part.id, 3);

    const usage = await getPartUsage(part.id);
    // Everything just happened, so today's figure carries into every window.
    expect(usage.today).toBe(3);
    expect(usage.week).toBe(3);
    expect(usage.month).toBe(3);
  });

  it("carries 30-day usage onto the low-stock rows", async () => {
    const { customer, part } = await seedCustomerAndPart(10);
    await useOnCompletedJob(customer.id, part.id, 9);

    // 10 - 9 = 1 left in the shop, against a minimum of 2.
    const rows = await getLowStock();
    const row = rows.find((r: any) => r.partId === part.id);

    expect(row).toBeDefined();
    expect(row.shopStock).toBe(1);
    expect(row.usedLast30Days).toBe(9);
  });
});
