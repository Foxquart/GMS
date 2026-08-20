import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { customers, vehicles, jobs, invoices, payments } from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";

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
      outstanding: sql<string>`coalesce((select sum(${invoices.dueAmount}) from ${invoices} where ${invoices.customerId} = ${customers.id} and ${invoices.status} in ('ISSUED','PARTIALLY_PAID')), 0)`,
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

  const vehicleList = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.customerId, id))
    .orderBy(desc(vehicles.createdAt));

  const jobList = await db
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
    .limit(20);

  const invoiceList = await db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, id))
    .orderBy(desc(invoices.createdAt));

  const totals = await db
    .select({
      billed: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      paid: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(invoices)
    .leftJoin(payments, eq(payments.invoiceId, invoices.id))
    .where(eq(invoices.customerId, id));

  return {
    customer,
    vehicles: vehicleList,
    jobs: jobList,
    invoices: invoiceList,
    stats: {
      billed: Number(totals[0]?.billed ?? 0),
      paid: Number(totals[0]?.paid ?? 0),
      outstanding: Number(totals[0]?.billed ?? 0) - Number(totals[0]?.paid ?? 0),
    },
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

export async function getCustomerSummary(id: string) {
  const [billed] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
    .from(invoices)
    .where(eq(invoices.customerId, id));
  const [paid] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.customerId, id));
  return {
    billed: Number(billed?.total ?? 0),
    paid: Number(paid?.total ?? 0),
    outstanding: Number(billed?.total ?? 0) - Number(paid?.total ?? 0),
  };
}