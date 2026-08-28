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

// Registration numbers are typed by hand, so "WB 12 AB 3456", "wb12ab3456" and
// "WB-12-AB-3456" all mean the same vehicle.
function normalizeRegistration(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[\s-]/g, "");
}

/**
 * Vehicle dedupe rule: a customer must not collect a duplicate vehicle row per
 * job. When no explicit vehicleId is given we reuse the customer's vehicle whose
 * registration number matches (case-insensitively, ignoring spaces/hyphens),
 * refreshing its type/name when the operator typed something new. Without a
 * registration number we reuse the customer's most recent vehicle when the type
 * matches. Only when nothing matches do we insert a new vehicle. `linkedVehicleId`
 * lets an edit fill in a registration number on the job's own (blank) vehicle
 * instead of spawning a near-duplicate.
 */
async function resolveVehicleId(
  customerId: string,
  input: { vehicleType?: string; vehicleName?: string; registrationNumber?: string },
  linkedVehicleId?: string | null,
) {
  const vehicleType = (input.vehicleType || "OTHER") as any;
  const registrationNumber = input.registrationNumber?.trim() || undefined;
  const key = normalizeRegistration(registrationNumber);

  const owned = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.customerId, customerId))
    .orderBy(desc(vehicles.createdAt));

  const linked = linkedVehicleId ? owned.find((v: any) => v.id === linkedVehicleId) : undefined;
  let match = key
    ? owned.find((v: any) => normalizeRegistration(v.registrationNumber) === key)
    : owned[0] && owned[0].vehicleType === vehicleType
      ? owned[0]
      : undefined;
  if (!match && linked && !normalizeRegistration(linked.registrationNumber)) {
    match = linked;
  }

  if (match) {
    const updates: Record<string, unknown> = {};
    if (input.vehicleType && match.vehicleType !== vehicleType) updates.vehicleType = vehicleType;
    if (input.vehicleName !== undefined && (input.vehicleName || null) !== match.vehicleName) {
      updates.vehicleName = input.vehicleName || null;
    }
    if (registrationNumber && !match.registrationNumber) {
      updates.registrationNumber = registrationNumber;
    }
    if (Object.keys(updates).length) {
      await db
        .update(vehicles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(vehicles.id, match.id));
    }
    return match.id;
  }

  const [created] = await db
    .insert(vehicles)
    .values({
      customerId,
      vehicleType,
      vehicleName: input.vehicleName || null,
      registrationNumber: registrationNumber ?? null,
    })
    .returning();
  return created.id;
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

  const vehicleId =
    input.vehicleId ??
    (await resolveVehicleId(input.customerId, {
      vehicleType: input.vehicleType,
      vehicleName: input.vehicleName,
      registrationNumber: input.registrationNumber,
    }));

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

  // Everything below only needs the job row above, not each other. These were
  // five more sequential round trips; they now go out in one wave.
  const [customerRows, vehicleRows, labour, jobPartList, invoiceRows] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1),
    job.vehicleId
      ? db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1)
      : Promise.resolve([] as any[]),
    db
      .select()
      .from(jobLabour)
      .where(eq(jobLabour.jobId, id))
      .orderBy(jobLabour.createdAt),
    db
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
      .orderBy(jobParts.createdAt),
    db.select().from(invoices).where(eq(invoices.jobId, id)).limit(1),
  ]);

  const customer = customerRows[0];
  const vehicle = vehicleRows[0];
  const invoice = invoiceRows[0];

  return { job, customer, vehicle: vehicle ?? null, labour, parts: jobPartList, invoice: invoice ?? null };
}

export async function updateJob(
  id: string,
  input: {
    status?: string;
    complaint?: string;
    workNotes?: string;
    odometerReading?: string;
    customerId?: string;
    vehicleType?: string;
    vehicleName?: string;
    registrationNumber?: string;
  },
) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  if (!job) throw new ApiError(404, "Job not found");

  const { customerId, vehicleType, vehicleName, registrationNumber, ...jobFields } = input;
  const editsDetails =
    jobFields.complaint !== undefined ||
    jobFields.workNotes !== undefined ||
    jobFields.odometerReading !== undefined ||
    customerId !== undefined ||
    vehicleType !== undefined ||
    vehicleName !== undefined ||
    registrationNumber !== undefined;

  // A completed job is frozen — its invoice and stock movements already exist.
  if (editsDetails && job.status !== "OPEN") {
    throw new ApiError(
      409,
      job.status === "COMPLETED"
        ? "This job is already finished and cannot be changed."
        : "Reopen this cancelled job before editing it.",
    );
  }
  if (input.status && input.status !== job.status) {
    if (job.status === "COMPLETED") {
      throw new ApiError(409, "This job is already finished and cannot be changed.");
    }
    if (input.status === "COMPLETED") {
      throw new ApiError(409, "Use the complete-job flow to finish a job.");
    }
    // OPEN → CANCELLED and CANCELLED → OPEN are both fine.
  }

  const updates: Record<string, unknown> = { ...jobFields, updatedAt: new Date() };
  if (input.status) updates.status = input.status;

  if (customerId && customerId !== job.customerId) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) throw new ApiError(404, "Customer not found");
    updates.customerId = customerId;
  }

  const movedCustomer = Boolean(customerId && customerId !== job.customerId);
  if (
    vehicleType !== undefined ||
    vehicleName !== undefined ||
    registrationNumber !== undefined ||
    movedCustomer
  ) {
    // Vehicle edits land on the job's linked vehicle when it is still the same
    // vehicle, otherwise the dedupe rule reuses or creates the right one.
    const [current] = job.vehicleId
      ? await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1)
      : [];
    updates.vehicleId = await resolveVehicleId(
      customerId ?? job.customerId,
      {
        vehicleType: vehicleType ?? current?.vehicleType,
        vehicleName: vehicleName !== undefined ? vehicleName : (current?.vehicleName ?? undefined),
        registrationNumber:
          registrationNumber !== undefined
            ? registrationNumber
            : (current?.registrationNumber ?? undefined),
      },
      movedCustomer ? null : job.vehicleId,
    );
  }

  const [row] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, id))
    .returning();
  return row;
}

export async function deleteJob(id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  if (!job) throw new ApiError(404, "Job not found");
  if (job.status === "COMPLETED") {
    throw new ApiError(409, "This job is already finished and can no longer be deleted.");
  }

  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.jobId, id))
    .limit(1);
  if (invoice) {
    throw new ApiError(409, "This job has been invoiced and can no longer be deleted.");
  }

  // Stock is only deducted when a job is completed, so an unfinished job has no
  // stock movements to unwind — just its child rows.
  await db.transaction(async (tx: any) => {
    await tx.delete(jobParts).where(eq(jobParts.jobId, id));
    await tx.delete(jobLabour).where(eq(jobLabour.jobId, id));
    await tx.delete(jobs).where(eq(jobs.id, id));
  });

  return { id };
}


/**
 * Cheap editability guard. The mutations below only need the job's status,
 * but each one used to call getJob(), which fans out six queries to build a
 * full detail payload that was then thrown away.
 */
async function assertJobEditable(jobId: string) {
  const [row] = await db
    .select({ status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!row) throw new ApiError(404, "Job not found");
  if (isTerminalStatus(row.status)) {
    throw new ApiError(409, "Cannot modify a finished job.");
  }
}

// ─── Labour ──────────────────────────────────────────────────────────
export async function addLabour(jobId: string, input: { description: string; amount: number }) {
  await assertJobEditable(jobId);
  const [row] = await db
    .insert(jobLabour)
    .values({ jobId, description: input.description, amount: String(input.amount) })
    .returning();
  return row;
}

export async function removeLabour(jobId: string, labourId: string) {
  await assertJobEditable(jobId);
  await db
    .delete(jobLabour)
    .where(and(eq(jobLabour.id, labourId), eq(jobLabour.jobId, jobId)));
}

// ─── Parts on job ────────────────────────────────────────────────────
export async function addJobPart(jobId: string, input: { partId: string; quantity: number }) {
  await assertJobEditable(jobId);
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
  await assertJobEditable(jobId);
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
  await assertJobEditable(jobId);
  await db
    .delete(jobParts)
    .where(and(eq(jobParts.id, jobPartId), eq(jobParts.jobId, jobId)));
}