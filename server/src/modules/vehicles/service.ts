import { eq, ilike, or, sql, desc, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import { vehicles, customers, serviceJobs, jobLabour, jobParts, invoices } from '../../db/schema';
import type { CreateVehicleInput, UpdateVehicleInput } from './schema';

export async function getVehicles(search?: string, customerId?: string, limit = 20, page = 1) {
  const offset = (page - 1) * limit;

  const conditions = [];

  if (customerId) {
    conditions.push(eq(vehicles.customerId, customerId));
  }

  if (search) {
    conditions.push(
      or(
        ilike(vehicles.registrationNumber, `%${search}%`),
        ilike(vehicles.make, `%${search}%`),
        ilike(vehicles.model, `%${search}%`),
        ilike(customers.name, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id))
    .where(whereClause);

  const total = Number(countResult?.count ?? 0);

  const data = await db
    .select({
      id: vehicles.id,
      customerId: vehicles.customerId,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
      variant: vehicles.variant,
      year: vehicles.year,
      fuelType: vehicles.fuelType,
      currentOdometer: vehicles.currentOdometer,
      createdAt: vehicles.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(vehicles.createdAt))
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

export async function createVehicle(input: CreateVehicleInput) {
  const [vehicle] = await db
    .insert(vehicles)
    .values({
      customerId: input.customerId,
      registrationNumber: input.registrationNumber.trim().toUpperCase(),
      make: input.make,
      model: input.model,
      variant: input.variant || null,
      year: input.year || null,
      fuelType: input.fuelType || null,
      vin: input.vin || null,
      currentOdometer: input.currentOdometer || null,
      notes: input.notes || null,
    })
    .returning();

  return vehicle;
}

export async function getVehicleById(id: string) {
  const [vehicle] = await db
    .select({
      id: vehicles.id,
      customerId: vehicles.customerId,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
      variant: vehicles.variant,
      year: vehicles.year,
      fuelType: vehicles.fuelType,
      vin: vehicles.vin,
      currentOdometer: vehicles.currentOdometer,
      notes: vehicles.notes,
      createdAt: vehicles.createdAt,
      updatedAt: vehicles.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
    })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id))
    .where(eq(vehicles.id, id))
    .limit(1);

  if (!vehicle) return null;

  // Get full service history
  const jobs = await db
    .select({
      id: serviceJobs.id,
      jobNumber: serviceJobs.jobNumber,
      status: serviceJobs.status,
      complaint: serviceJobs.complaint,
      inspectionNotes: serviceJobs.inspectionNotes,
      workNotes: serviceJobs.workNotes,
      odometerReading: serviceJobs.odometerReading,
      actualTotal: serviceJobs.actualTotal,
      startedAt: serviceJobs.startedAt,
      completedAt: serviceJobs.completedAt,
      createdAt: serviceJobs.createdAt,
      invoiceNumber: invoices.invoiceNumber,
      invoiceTotal: invoices.total,
      paidAmount: invoices.paidAmount,
      invoiceStatus: invoices.status,
    })
    .from(serviceJobs)
    .leftJoin(invoices, eq(serviceJobs.id, invoices.jobId))
    .where(eq(serviceJobs.vehicleId, id))
    .orderBy(desc(serviceJobs.createdAt));

  // Populate parts and labour for each job
  const serviceHistory = await Promise.all(
    jobs.map(async (job) => {
      const labourItems = await db
        .select()
        .from(jobLabour)
        .where(eq(jobLabour.jobId, job.id));

      const partsUsed = await db
        .select()
        .from(jobParts)
        .where(eq(jobParts.jobId, job.id));

      return {
        ...job,
        labourItems,
        partsUsed,
      };
    })
  );

  return {
    ...vehicle,
    serviceHistory,
  };
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  const [updated] = await db
    .update(vehicles)
    .set({
      ...input,
      registrationNumber: input.registrationNumber ? input.registrationNumber.trim().toUpperCase() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, id))
    .returning();

  return updated || null;
}
