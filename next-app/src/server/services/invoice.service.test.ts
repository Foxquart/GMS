import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import { createJob, addLabour, saveJobPart } from "@/server/services/job.service";
import { completeJob, recordPayment, getInvoice } from "@/server/services/invoice.service";
import { getPartBalance } from "@/server/services/inventory.service";
import { getCustomerOutstanding } from "@/server/services/report.service";

describe("job → invoice flow", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  async function seedJobWithPartsAndLabour() {
    const { customer, part } = await seedCustomerAndPart(10);
    const job = await createJob({ customerId: customer.id, vehicleType: "CAR", complaint: "Noise" });
    await saveJobPart(job.id, { partId: part.id, quantity: 2 });
    await addLabour(job.id, { description: "Labour", amount: 300 });
    return { customer, part, job };
  }

  it("deducts shop stock on completion and creates an invoice", async () => {
    const { customer, part, job } = await seedJobWithPartsAndLabour();

    const before = await getPartBalance(part.id, "SHOP");
    expect(before).toBe(10);

    const { invoice } = await completeJob({ jobId: job.id });

    const after = await getPartBalance(part.id, "SHOP");
    expect(after).toBe(8);

    // subtotal = 2 * 450 (part) + 300 (labour) = 1200
    expect(Number(invoice.subtotal)).toBe(1200);
    expect(Number(invoice.total)).toBe(1200);
    expect(invoice.customerId).toBe(customer.id);
    expect(invoice.status).toBe("ISSUED");

    const full = await getInvoice(invoice.id);
    expect(full.items).toHaveLength(2);
  });

  it("applies discount and records initial payment", async () => {
    const { part, job } = await seedJobWithPartsAndLabour();

    const { invoice } = await completeJob({
      jobId: job.id,
      discount: 200,
      payment: { amount: 500, method: "CASH" },
    });

    expect(Number(invoice.total)).toBe(1000);
    expect(invoice.status).toBe("ISSUED");

    // Payment is applied inside the transaction; re-fetch to see the update.
    const full = await getInvoice(invoice.id);
    expect(Number(full.invoice.paidAmount)).toBe(500);
    expect(Number(full.invoice.dueAmount)).toBe(500);
    expect(full.invoice.status).toBe("PARTIALLY_PAID");

    const after = await getPartBalance(part.id, "SHOP");
    expect(after).toBe(8);
  });

  it("rejects completing an already-completed job", async () => {
    const { job } = await seedJobWithPartsAndLabour();
    await completeJob({ jobId: job.id });
    await expect(completeJob({ jobId: job.id })).rejects.toThrow(/already completed/i);
  });

  it("fails completion when shop stock is insufficient", async () => {
    const { part, customer } = await seedCustomerAndPart(1);
    const job = await createJob({ customerId: customer.id, vehicleType: "BIKE" });
    await saveJobPart(job.id, { partId: part.id, quantity: 5 });
    await expect(completeJob({ jobId: job.id })).rejects.toThrow(/not enough/i);
  });

  it("records partial then full payment and flips status to PAID", async () => {
    const { job } = await seedJobWithPartsAndLabour();
    const { invoice } = await completeJob({ jobId: job.id });

    await recordPayment({ invoiceId: invoice.id, amount: 700, method: "UPI" });
    let full = await getInvoice(invoice.id);
    expect(full.invoice.status).toBe("PARTIALLY_PAID");
    expect(Number(full.invoice.paidAmount)).toBe(700);

    await recordPayment({ invoiceId: invoice.id, amount: 500, method: "CASH" });
    full = await getInvoice(invoice.id);
    expect(full.invoice.status).toBe("PAID");
    expect(Number(full.invoice.dueAmount)).toBe(0);
  });

  it("rejects a payment larger than the outstanding balance", async () => {
    const { job } = await seedJobWithPartsAndLabour();
    const { invoice } = await completeJob({ jobId: job.id });
    await expect(recordPayment({ invoiceId: invoice.id, amount: 9999, method: "CASH" })).rejects.toThrow(
      /exceeds/i,
    );
  });

  it("rejects payment on a fully paid invoice", async () => {
    const { job } = await seedJobWithPartsAndLabour();
    const { invoice } = await completeJob({ jobId: job.id });
    await recordPayment({ invoiceId: invoice.id, amount: 1200, method: "CASH" });
    await expect(recordPayment({ invoiceId: invoice.id, amount: 100, method: "CASH" })).rejects.toThrow(
      /already fully paid/i,
    );
  });

  it("lists a partially-paid customer in the outstanding report", async () => {
    const { customer, part, job } = await seedJobWithPartsAndLabour();
    await completeJob({ jobId: job.id, payment: { amount: 300, method: "CASH" } });

    const outstanding = await getCustomerOutstanding();
    const row = outstanding.find((o: any) => o.customerId === customer.id);
    expect(row).toBeTruthy();
    expect(Number(row.dueAmount)).toBe(900); // 1200 - 300

    // A fully-paid follow-up invoice keeps the customer in the report
    // (still one outstanding invoice) but doesn't change the due amount.
    const job2 = await createJob({ customerId: customer.id, vehicleType: "CAR" });
    await saveJobPart(job2.id, { partId: part.id, quantity: 1 });
    await completeJob({ jobId: job2.id, payment: { amount: 450, method: "CASH" } });
    const outstanding2 = await getCustomerOutstanding();
    expect(outstanding2.find((o: any) => o.customerId === customer.id)?.dueAmount).toBe(900);
  });
});