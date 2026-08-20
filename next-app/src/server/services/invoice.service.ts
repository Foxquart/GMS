import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  customers as customersTable,
  invoiceItems,
  invoices,
  inventoryBalances,
  jobLabour,
  jobParts,
  jobs,
  payments,
  settings,
  stockMovements,
  vehicles,
} from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";
import { getLocationByCode } from "./inventory.service";

// ─── Invoice numbering: INV-2026-000001 ──────────────────────────────
async function nextInvoiceNumberTx(tx: any) {
  const [setting] = await tx.select().from(settings).limit(1);
  const prefix = setting?.invoicePrefix ?? "INV";
  const year = new Date().getFullYear();
  const searchPrefix = `${prefix}-${year}-`;
  const rows = await tx
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${searchPrefix + "%"}`)
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);
  const last = rows[0]?.invoiceNumber;
  const seq = last ? parseInt(last.split("-").pop() ?? "0", 10) + 1 : 1;
  return `${searchPrefix}${String(seq).padStart(6, "0")}`;
}

async function changeBalance(
  tx: any,
  partId: string,
  locationId: string,
  delta: number,
  movementType: string,
  reference?: { type: string; id?: string },
  notes?: string,
) {
  const [existing] = await tx
    .select()
    .from(inventoryBalances)
    .where(
      and(
        eq(inventoryBalances.partId, partId),
        eq(inventoryBalances.locationId, locationId),
      ),
    )
    .limit(1);

  if (existing) {
    const newQty = existing.quantity + delta;
    if (newQty < 0) {
      throw new ApiError(
        409,
        "Not enough Shop stock to complete this job. Move stock from Warehouse or review the parts.",
        "INSUFFICIENT_STOCK",
      );
    }
    await tx
      .update(inventoryBalances)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(inventoryBalances.id, existing.id));
  } else if (delta < 0) {
    throw new ApiError(409, "Not enough Shop stock to complete this job.", "INSUFFICIENT_STOCK");
  } else {
    await tx.insert(inventoryBalances).values({ partId, locationId, quantity: delta });
  }

  await tx.insert(stockMovements).values({
    partId,
    locationId,
    movementType,
    quantity: delta,
    referenceType: reference?.type,
    referenceId: reference?.id,
    notes,
  });
}

// ─── Complete job (atomic transaction) ───────────────────────────────
export async function completeJob(input: {
  jobId: string;
  discount?: number;
  notes?: string;
  payment?: { amount?: number; method?: string; notes?: string } | null;
}) {
  const shop = await getLocationByCode("SHOP");

  let result: any;
  await db.transaction(async (tx: any) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId))
      .for("update")
      .limit(1);
    if (!job) throw new ApiError(404, "Job not found");
    if (job.status === "COMPLETED") {
      throw new ApiError(409, "This job is already completed.", "JOB_ALREADY_COMPLETED");
    }
    if (job.status === "CANCELLED") {
      throw new ApiError(409, "This job was cancelled and cannot be completed.");
    }

    const partRows = await tx
      .select()
      .from(jobParts)
      .where(eq(jobParts.jobId, job.id));
    const labourRows = await tx
      .select()
      .from(jobLabour)
      .where(eq(jobLabour.jobId, job.id));

    // Deduct shop stock for each part, creating JOB_USAGE movements.
    for (const jp of partRows) {
      await changeBalance(
        tx,
        jp.partId,
        shop.id,
        -jp.quantity,
        "JOB_USAGE",
        { type: "JOB", id: job.id },
        `JOB-${job.jobNumber}`,
      );
    }

    const subtotal =
      partRows.reduce((s: number, p: any) => s + Number(p.totalPrice), 0) +
      labourRows.reduce((s: number, l: any) => s + Number(l.amount), 0);
    const discount = input.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber: await nextInvoiceNumberTx(tx),
        jobId: job.id,
        customerId: job.customerId,
        vehicleId: job.vehicleId,
        subtotal: String(subtotal),
        discount: String(discount),
        total: String(total),
        paidAmount: "0",
        dueAmount: String(total),
        status: "ISSUED",
        notes: input.notes,
      })
      .returning();

    for (const jp of partRows) {
      await tx.insert(invoiceItems).values({
        invoiceId: invoice.id,
        itemType: "part",
        description: jp.partName,
        quantity: String(jp.quantity),
        unitPrice: String(Number(jp.unitPrice)),
        totalPrice: String(Number(jp.totalPrice)),
      });
    }
    for (const lb of labourRows) {
      await tx.insert(invoiceItems).values({
        invoiceId: invoice.id,
        itemType: "labour",
        description: lb.description,
        quantity: "1",
        unitPrice: String(Number(lb.amount)),
        totalPrice: String(Number(lb.amount)),
      });
    }

    await tx
      .update(jobs)
      .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    // Record initial payment if provided.
    let payment = null;
    if (input.payment?.amount && input.payment.amount > 0) {
      const amount = Math.min(input.payment.amount, total);
      const method = (input.payment.method ?? "CASH") as any;
      const [p] = await tx
        .insert(payments)
        .values({
          invoiceId: invoice.id,
          customerId: job.customerId,
          amount: String(amount),
          paymentMethod: method,
          notes: input.payment.notes,
        })
        .returning();
      payment = p;

      const paidAmount = amount;
      const dueAmount = total - paidAmount;
      const status = dueAmount <= 0 ? "PAID" : "PARTIALLY_PAID";
      await tx
        .update(invoices)
        .set({ paidAmount: String(paidAmount), dueAmount: String(dueAmount), status })
        .where(eq(invoices.id, invoice.id));
    }

    result = { job, invoice, payment };
  });

  return result;
}

// ─── Invoice reads ───────────────────────────────────────────────────
export async function listInvoices(opts: { status?: string; q?: string }) {
  const conditions = [];
  if (opts.status && opts.status !== "ALL") {
    conditions.push(eq(invoices.status, opts.status as any));
  }
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${customersTable.name}) like ${like} or ${invoices.invoiceNumber} like ${like})`,
    );
  }
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      dueAmount: invoices.dueAmount,
      createdAt: invoices.createdAt,
      customerId: invoices.customerId,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
    })
    .from(invoices)
    .innerJoin(customersTable, eq(invoices.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(invoices.createdAt))
    .limit(100);
  return rows;
}

export async function getInvoice(id: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, invoice.customerId))
    .limit(1);
  const [vehicle] = invoice.vehicleId
    ? await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, invoice.vehicleId))
        .limit(1)
    : [];
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, invoice.jobId))
    .limit(1);
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.itemType);
  const paymentList = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(desc(payments.createdAt));
  const [business] = await db.select().from(settings).limit(1);

  return {
    invoice,
    customer,
    vehicle: vehicle ?? null,
    job,
    items,
    payments: paymentList,
    business: business ?? null,
  };
}

export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  method: string;
  notes?: string;
}) {
  let result: any;
  await db.transaction(async (tx: any) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .for("update")
      .limit(1);
    if (!invoice) throw new ApiError(404, "Invoice not found");
    if (invoice.status === "CANCELLED") {
      throw new ApiError(409, "Cannot add a payment to a cancelled invoice.");
    }
    if (invoice.status === "PAID") {
      throw new ApiError(409, "This invoice is already fully paid.");
    }
    const outstanding = Number(invoice.dueAmount);
    if (input.amount > outstanding) {
      throw new ApiError(
        409,
        `Payment of ₹${input.amount} exceeds the outstanding balance of ₹${outstanding}.`,
      );
    }

    const [payment] = await tx
      .insert(payments)
      .values({
        invoiceId: input.invoiceId,
        customerId: invoice.customerId,
        amount: String(input.amount),
        paymentMethod: input.method as any,
        notes: input.notes,
      })
      .returning();

    const paidAmount = Number(invoice.paidAmount) + input.amount;
    const dueAmount = Number(invoice.dueAmount) - input.amount;
    const status = dueAmount <= 0 ? "PAID" : "PARTIALLY_PAID";
    await tx
      .update(invoices)
      .set({
        paidAmount: String(paidAmount),
        dueAmount: String(dueAmount),
        status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, input.invoiceId));

    result = { payment, paidAmount, dueAmount, status };
  });
  return result;
}