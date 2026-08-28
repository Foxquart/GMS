import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { customers, vehicles, jobs, invoices, payments } from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";
import { OUTSTANDING_INVOICE_STATUSES } from "./invoice.service";

const CUSTOMER_VEHICLE_TYPE_VALUES = ["CAR", "BIKE", "SCOOTY", "AUTO", "OTHER"] as const;

export async function listCustomers(opts: { q?: string }) {
  const conditions = [];
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${customers.name}) like ${like}`,
        sql`lower(${customers.phone}) like ${like}`,
      ),
    );
  }

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      createdAt: customers.createdAt,
      totalJobs: sql<number>`(select count(*) from ${jobs} where ${jobs.customerId} = ${customers.id})`,
      outstanding: sql<string>`coalesce((select sum(${invoices.dueAmount}) from ${invoices} where ${invoices.customerId} = ${customers.id} and ${inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES])}), 0)`,
    })
    .from(customers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(customers.name);
  return rows;
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
}) {
  const [row] = await db.insert(customers).values(input).returning();
  return row;
}

export async function updateCustomer(
  id: string,
  input: { name?: string; phone?: string; address?: string; notes?: string },
) {
  const [row] = await db
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Customer not found");
  return row;
}

export async function getCustomerDetail(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  if (!customer) throw new ApiError(404, "Customer not found");

  // The four reads below are independent of one another — they were four
  // sequential round trips, which is four times the network latency on a
  // remote database for no gain.
  const [vehicleList, jobList, invoiceList, stats] = await Promise.all([
    db
      .select()
      .from(vehicles)
      .where(eq(vehicles.customerId, id))
      .orderBy(desc(vehicles.createdAt)),
    db
      .select({
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        complaint: jobs.complaint,
        status: jobs.status,
        createdAt: jobs.createdAt,
        vehicleType: vehicles.vehicleType,
        total: sql<string>`coalesce((select ${invoices.total} from ${invoices} where ${invoices.jobId} = ${jobs.id}), 0)`,
      })
      .from(jobs)
      .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .where(eq(jobs.customerId, id))
      .orderBy(desc(jobs.createdAt))
      .limit(20),
    db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, id))
      .orderBy(desc(invoices.createdAt)),
    customerBillingStats(id),
  ]);

  return {
    customer,
    vehicles: vehicleList,
    jobs: jobList,
    invoices: invoiceList,
    stats,
  };
}

// ─── Vehicles ────────────────────────────────────────────────────────
export async function createVehicle(input: {
  customerId: string;
  vehicleType: string;
  vehicleName?: string;
  registrationNumber?: string;
  notes?: string;
}) {
  if (!CUSTOMER_VEHICLE_TYPE_VALUES.includes(input.vehicleType as any)) {
    throw new ApiError(400, "Invalid vehicle type");
  }
  const [row] = await db.insert(vehicles).values(input as any).returning();
  return row;
}

export async function listVehicles(customerId?: string) {
  if (customerId) {
    return db
      .select()
      .from(vehicles)
      .where(eq(vehicles.customerId, customerId))
      .orderBy(desc(vehicles.createdAt));
  }
  return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}

/**
 * Billing figures for one customer.
 *
 * Each figure is its own aggregate — joining invoices to payments would
 * multiply an invoice's `total` by its number of payments, inflating
 * "billed"/"due" as soon as a customer part-pays twice. CANCELLED invoices
 * never count, and `outstanding` is summed from `invoices.dueAmount` so it
 * always matches the per-invoice numbers listed on the customer page.
 */
export async function customerBillingStats(id: string) {
  const notCancelled = and(
    eq(invoices.customerId, id),
    ne(invoices.status, "CANCELLED"),
  );

  const [billedRow] = await db
    .select({
      billed: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      outstanding: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
      invoiceCount: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(notCancelled);

  // One row per payment, joined 1:1 to its invoice — no fan-out.
  const [paidRow] = await db
    .select({ paid: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(notCancelled);

  const [jobRow] = await db
    .select({ jobCount: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.customerId, id));

  const [unpaidRow] = await db
    .select({ unpaidInvoices: sql<number>`count(*)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, id),
        inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES]),
        sql`${invoices.dueAmount} > 0`,
      ),
    );

  return {
    billed: Number(billedRow?.billed ?? 0),
    paid: Number(paidRow?.paid ?? 0),
    outstanding: Number(billedRow?.outstanding ?? 0),
    invoiceCount: Number(billedRow?.invoiceCount ?? 0),
    unpaidInvoiceCount: Number(unpaidRow?.unpaidInvoices ?? 0),
    jobCount: Number(jobRow?.jobCount ?? 0),
  };
}

export async function getCustomerSummary(id: string) {
  const { billed, paid, outstanding } = await customerBillingStats(id);
  return { billed, paid, outstanding };
}