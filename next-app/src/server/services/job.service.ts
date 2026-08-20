import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  customers,
  inventoryBalances,
  invoices,
  jobLabour,
  jobParts,
  jobs,
  parts,
  vehicles,
} from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";
import { getLocationByCode } from "./inventory.service";

export function isTerminalStatus(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

async function nextJobNumber() {
  const year = new Date().getFullYear();
  const prefix = `JOB-${year}-`;
  const rows = await db
    .select({ jobNumber: jobs.jobNumber })
    .from(jobs)
    .where(sql`${jobs.jobNumber} like ${prefix + "%"}`)
    .orderBy(desc(jobs.jobNumber))
    .limit(1);
  const last = rows[0]?.jobNumber;
  const seq = last ? parseInt(last.split("-").pop() ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createJob(input: {
  customerId: string;
  vehicleId?: string;
  vehicleType?: string;
  vehicleName?: string;
  registrationNumber?: string;
  complaint?: string;
  workNotes?: string;
  odometerReading?: string;
  status?: string;
}) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .limit(1);
  if (!customer) throw new ApiError(404, "Customer not found");

  let vehicleId = input.vehicleId ?? null;
  if (!vehicleId) {
    // Create a minimal vehicle record on the fly.
    const [v] = await db
      .insert(vehicles)
      .values({
        customerId: input.customerId,
        vehicleType: (input.vehicleType ?? "OTHER") as any,
        vehicleName: input.vehicleName,
        registrationNumber: input.registrationNumber,
      })
      .returning();
    vehicleId = v.id;
  }

  const jobNumber = await nextJobNumber();
  const [job] = await db
    .insert(jobs)
    .values({
      jobNumber,
      customerId: input.customerId,
      vehicleId,
      complaint: input.complaint,
      workNotes: input.workNotes,
      odometerReading: input.odometerReading,
      status: (input.status ?? "OPEN") as any,
    })
    .returning();
  return job;
}

export async function listJobs(opts: {
  status?: string;
  q?: string;
  limit?: number;
}) {
  const conditions = [];
  if (opts.status && opts.status !== "ALL") {
    conditions.push(eq(jobs.status, opts.status as any));
  }
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${customers.name}) like ${like} or ${jobs.jobNumber} like ${like})`,
    );
  }

  const rows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      complaint: jobs.complaint,
      status: jobs.status,
      createdAt: jobs.createdAt,
      completedAt: jobs.completedAt,
      customerId: jobs.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      vehicleType: vehicles.vehicleType,
      vehicleName: vehicles.vehicleName,
      total: sql<string>`coalesce((select ${invoices.total} from ${invoices} where ${invoices.jobId} = ${jobs.id}), 0)`,
      invoiceId: sql<string | null>`(select ${invoices.id} from ${invoices} where ${invoices.jobId} = ${jobs.id})`,
      invoiceStatus: sql<string | null>`(select ${invoices.status} from ${invoices} where ${invoices.jobId} = ${jobs.id})`,
      partsCount: sql<number>`(select count(*) from ${jobParts} where ${jobParts.jobId} = ${jobs.id})`,
      labourCount: sql<number>`(select count(*) from ${jobLabour} where ${jobLabour.jobId} = ${jobs.id})`,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobs.createdAt))
    .limit(opts.limit ?? 100);
  return rows;
}

export async function getJob(id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  if (!job) throw new ApiError(404, "Job not found");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, job.customerId))
    .limit(1);
  const [vehicle] = job.vehicleId
    ? await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, job.vehicleId))
        .limit(1)
    : [];

  const labour = await db
    .select()
    .from(jobLabour)
    .where(eq(jobLabour.jobId, id))
    .orderBy(jobLabour.createdAt);

  const jobPartList = await db
    .select({
      id: jobParts.id,
      partId: jobParts.partId,
      partName: jobParts.partName,
      quantity: jobParts.quantity,
      unitPrice: jobParts.unitPrice,
      totalPrice: jobParts.totalPrice,
      sellingPrice: parts.sellingPrice,
    })
    .from(jobParts)
    .leftJoin(parts, eq(jobParts.partId, parts.id))
    .where(eq(jobParts.jobId, id))
    .orderBy(jobParts.createdAt);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.jobId, id))
    .limit(1);

  return { job, customer, vehicle: vehicle ?? null, labour, parts: jobPartList, invoice: invoice ?? null };
}

export async function updateJob(
  id: string,
  input: { status?: string; complaint?: string; workNotes?: string; odometerReading?: string },
) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  if (!job) throw new ApiError(404, "Job not found");

  const updates: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.status) {
    if (isTerminalStatus(job.status)) {
      throw new ApiError(409, "This job is already finished and cannot be changed.");
    }
    if (input.status === "COMPLETED") {
      throw new ApiError(409, "Use the complete-job flow to finish a job.");
    }
  }
  const [row] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, id))
    .returning();
  return row;
}

// ─── Labour ──────────────────────────────────────────────────────────
export async function addLabour(jobId: string, input: { description: string; amount: number }) {
  const job = await getJob(jobId);
  if (isTerminalStatus(job.job.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
  const [row] = await db
    .insert(jobLabour)
    .values({ jobId, description: input.description, amount: String(input.amount) })
    .returning();
  return row;
}

export async function removeLabour(jobId: string, labourId: string) {
  const job = await getJob(jobId);
  if (isTerminalStatus(job.job.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
  await db
    .delete(jobLabour)
    .where(and(eq(jobLabour.id, labourId), eq(jobLabour.jobId, jobId)));
}

// ─── Parts on job ────────────────────────────────────────────────────
export async function addJobPart(jobId: string, input: { partId: string; quantity: number }) {
  const job = await getJob(jobId);
  if (isTerminalStatus(job.job.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
  const shopLocation = await getLocationByCode("SHOP");
  const [part] = await db
    .select()
    .from(parts)
    .where(eq(parts.id, input.partId))
    .limit(1);
  if (!part) throw new ApiError(404, "Part not found");

  const balance = await db
    .select({ quantity: jobParts.quantity })
    .from(jobParts)
    .where(
      and(
        eq(jobParts.jobId, jobId),
        eq(jobParts.partId, input.partId),
      ),
    )
    .limit(1);

  const [shopStock] = await db
    .select({ quantity: sql<number>`coalesce(${inventoryBalances.quantity}, 0)` })
    .from(parts)
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.partId, parts.id),
        eq(inventoryBalances.locationId, shopLocation.id),
      ),
    )
    .where(eq(parts.id, input.partId))
    .limit(1);

  const existing = balance[0];
  const required = input.quantity + (existing ? existing.quantity : 0);

  return {
    shopStock: Number(shopStock?.quantity ?? 0),
    required,
    alreadyAdded: existing ? existing.quantity : 0,
  };
}

export async function saveJobPart(
  jobId: string,
  input: { partId: string; quantity: number; unitPrice?: number },
) {
  const job = await getJob(jobId);
  if (isTerminalStatus(job.job.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
  const [part] = await db
    .select()
    .from(parts)
    .where(eq(parts.id, input.partId))
    .limit(1);
  if (!part) throw new ApiError(404, "Part not found");

  const price = input.unitPrice ?? Number(part.sellingPrice);
  const quantity = Math.max(1, Math.floor(input.quantity));

  const [existing] = await db
    .select()
    .from(jobParts)
    .where(
      and(eq(jobParts.jobId, jobId), eq(jobParts.partId, input.partId)),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(jobParts)
      .set({
        quantity,
        unitPrice: String(price),
        totalPrice: String(price * quantity),
      })
      .where(eq(jobParts.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(jobParts)
    .values({
      jobId,
      partId: input.partId,
      partName: part.name,
      quantity,
      unitPrice: String(price),
      totalPrice: String(price * quantity),
    })
    .returning();
  return row;
}

export async function removeJobPart(jobId: string, jobPartId: string) {
  const job = await getJob(jobId);
  if (isTerminalStatus(job.job.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
  await db
    .delete(jobParts)
    .where(and(eq(jobParts.id, jobPartId), eq(jobParts.jobId, jobId)));
}