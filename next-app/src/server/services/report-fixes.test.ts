import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { db } from "@/server/db/connection";
import { customers, jobs } from "@/server/db/schema";
import { createJob, saveJobPart } from "@/server/services/job.service";
import { completeJob } from "@/server/services/invoice.service";
import { getCustomerOutstanding, getReport } from "@/server/services/report.service";

describe("outstanding credit", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  /** A customer left owing the full value of one completed job. */
  async function debtor(name: string, quantity: number) {
    const { part } = await seedCustomerAndPart(50);
    const [customer] = await db
      .insert(customers)
      .values({ name, phone: `98765${Math.floor(Math.random() * 90000 + 10000)}` })
      .returning();
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity });
    await completeJob({ jobId: job.id });
    return customer;
  }

  it("caps the list when asked, keeping the biggest debtors", async () => {
    // The dashboard renders one full-height row per customer, so unbounded
    // this section grew longer than the rest of the page put together.
    await debtor("Small", 1);
    await debtor("Large", 5);
    await debtor("Medium", 3);

    const all = await getCustomerOutstanding();
    expect(all).toHaveLength(3);

    const top = await getCustomerOutstanding({ limit: 2 });
    expect(top).toHaveLength(2);
    // Still ordered biggest-first, and it is the top of the same list — not
    // an arbitrary two.
    expect(top.map((r: any) => r.customerName)).toEqual(["Large", "Medium"]);
  });

  it("never returns a customer who owes nothing", async () => {
    // Filtered in SQL now rather than in JS after fetching every row, so a
    // settled customer is not materialised at all.
    const { customer, part } = await seedCustomerAndPart(50);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity: 1 });
    await completeJob({ jobId: job.id, payment: { amount: 450, method: "CASH" } });

    const rows = await getCustomerOutstanding();
    expect(rows.find((r: any) => r.customerId === customer.id)).toBeUndefined();
  });
});

describe("completed-in-period", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("counts a completed job whose completedAt was never set", async () => {
    // The predicate read `jobs.completedAt ?? jobs.createdAt`, which looks
    // like a fallback but tests a column object that is never nullish — so the
    // createdAt branch was dead and rows like this vanished from the count.
    const { customer, part } = await seedCustomerAndPart(50);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity: 1 });
    await completeJob({ jobId: job.id });

    expect((await getReport("daily")).jobsCompleted).toBe(1);

    await db.update(jobs).set({ completedAt: null }).where(eq(jobs.id, job.id));

    const report = await getReport("daily");
    expect(report.jobsCompleted).toBe(1);
    // It cannot contribute to the average, and the sample size says so rather
    // than leaving the two figures looking inconsistent.
    expect(report.turnaroundSample).toBe(0);
    expect(report.avgTurnaroundHours).toBeNull();
  });

  it("reports no turnaround rather than zero when nothing completed", async () => {
    const report = await getReport("daily");
    expect(report.jobsCompleted).toBe(0);
    expect(report.avgTurnaroundHours).toBeNull();
  });
});
