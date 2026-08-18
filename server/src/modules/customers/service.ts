import { eq, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../../db/connection';
import { customers, vehicles, serviceJobs, invoices, payments } from '../../db/schema';
import type { CreateCustomerInput, UpdateCustomerInput } from './schema';

export async function getCustomers(search?: string, limit = 20, page = 1) {
  const offset = (page - 1) * limit;

  const whereClause = search
    ? or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`)
      )
    : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(whereClause);

  const total = Number(countResult?.count ?? 0);

  const data = await db
    .select()
    .from(customers)
    .where(whereClause)
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createCustomer(input: CreateCustomerInput) {
  const [customer] = await db
    .insert(customers)
    .values({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
    })
    .returning();

  return customer;
}

export async function getCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return null;

  // Get customer vehicles
  const customerVehicles = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.customerId, id))
    .orderBy(desc(vehicles.createdAt));

  // Get job stats
  const [jobStats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(serviceJobs)
    .where(eq(serviceJobs.customerId, id));

  // Get billing stats
  const [billingStats] = await db
    .select({
      totalBilled: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      totalPaid: sql<string>`coalesce(sum(${invoices.paidAmount}), 0)`,
      outstanding: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.customerId, id));

  // Get recent jobs
  const recentJobs = await db
    .select({
      id: serviceJobs.id,
      jobNumber: serviceJobs.jobNumber,
      status: serviceJobs.status,
      complaint: serviceJobs.complaint,
      actualTotal: serviceJobs.actualTotal,
      createdAt: serviceJobs.createdAt,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
    })
    .from(serviceJobs)
    .leftJoin(vehicles, eq(serviceJobs.vehicleId, vehicles.id))
    .where(eq(serviceJobs.customerId, id))
    .orderBy(desc(serviceJobs.createdAt))
    .limit(5);

  return {
    ...customer,
    vehicles: customerVehicles,
    totalJobs: Number(jobStats?.count ?? 0),
    totalBilled: Number(billingStats?.totalBilled ?? 0),
    totalPaid: Number(billingStats?.totalPaid ?? 0),
    outstanding: Number(billingStats?.outstanding ?? 0),
    recentJobs,
  };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const [updated] = await db
    .update(customers)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  return updated || null;
}
