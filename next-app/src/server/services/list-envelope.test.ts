import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { createJob } from "@/server/services/job.service";
import { listJobs } from "@/server/services/job.service";
import { listMovements, stockIn } from "@/server/services/inventory.service";

/**
 * Capped lists must report the size of the set they were cut from.
 *
 * The failure this guards against is not a crash — it is a list that ends at
 * its ceiling and says nothing, which reads as "that is everything". These
 * assert the two halves that make it honest: `rows` respects the cap, and
 * `total` ignores it.
 */
describe("capped list envelopes", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("caps the rows but counts every match", async () => {
    const { customer } = await seedCustomerAndPart(10);
    for (let i = 0; i < 7; i++) {
      await createJob({ customerId: customer.id, vehicleType: "BIKE", complaint: `Job ${i}` });
    }

    const capped = await listJobs({ limit: 3 });
    expect(capped.rows).toHaveLength(3);
    expect(capped.total).toBe(7);
    expect(capped.limit).toBe(3);

    // Nothing hidden when everything fits — this is the normal case, and the
    // UI hangs its "showing N of M" note on total > rows.length.
    const whole = await listJobs({});
    expect(whole.rows).toHaveLength(7);
    expect(whole.total).toBe(7);
  });

  it("counts only what the filter matches, not the whole table", async () => {
    // A total that ignored the WHERE would claim there is more to see behind a
    // filter that is already showing everything it matches.
    const { customer } = await seedCustomerAndPart(10);
    await createJob({ customerId: customer.id, vehicleType: "CAR", complaint: "Open one" });

    const open = await listJobs({ status: "OPEN" });
    const completed = await listJobs({ status: "COMPLETED" });

    expect(open.total).toBe(1);
    expect(completed.total).toBe(0);
    expect(completed.rows).toHaveLength(0);
  });

  it("counts movements against the same filter the rows use", async () => {
    const { part } = await seedCustomerAndPart(5);
    const other = await seedCustomerAndPart(5);
    await stockIn({ partId: part.id, locationCode: "SHOP", quantity: 2 });
    await stockIn({ partId: part.id, locationCode: "SHOP", quantity: 3 });
    await stockIn({ partId: other.part.id, locationCode: "SHOP", quantity: 4 });

    const mine = await listMovements({ partId: part.id });
    expect(mine.total).toBe(mine.rows.length);
    expect(mine.rows.every((m: any) => m.partId === part.id)).toBe(true);

    const all = await listMovements({});
    expect(all.total).toBeGreaterThan(mine.total);
  });
});
