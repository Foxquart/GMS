import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  customers as customersTable,
  invoices,
  jobs,
  payments,
  stockMovements,
  parts,
  inventoryLocations,
  inventoryBalances,
  vehicles,
} from "@/server/db/schema";
import { OUTSTANDING_INVOICE_STATUSES } from "./invoice.service";

function periodStart(period: "daily" | "weekly" | "monthly" | "yearly") {
  const now = new Date();
  const start = new Date(now);
  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = (now.getDay() + 6) % 7; // Monday start
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

export async function getReport(period: "daily" | "weekly" | "monthly" | "yearly") {
  const start = periodStart(period);
  const now = new Date();

  const [billedRow] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
    .from(invoices)
    .where(
      and(
        gte(invoices.createdAt, start),
        lt(invoices.createdAt, now),
        ne(invoices.status, "CANCELLED"),
      ),
    );
  const [collectedRow] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(gte(payments.createdAt, start), lt(payments.createdAt, now)));
  const [jobsRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "COMPLETED"),
        gte(jobs.completedAt ?? jobs.createdAt, start),
      ),
    );
  const [invoicesRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(invoices)
    .where(
      and(
        gte(invoices.createdAt, start),
        lt(invoices.createdAt, now),
        ne(invoices.status, "CANCELLED"),
      ),
    );

  const [outstandingRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
    })
    .from(invoices)
    .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES]));

  const [partsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${stockMovements.quantity} * -1), 0)` })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.movementType, "JOB_USAGE"),
        gte(stockMovements.createdAt, start),
      ),
    );

  return {
    period,
    start,
    end: now,
    billed: Number(billedRow?.total ?? 0),
    collected: Number(collectedRow?.total ?? 0),
    outstanding: Number(outstandingRow?.total ?? 0),
    jobsCompleted: Number(jobsRow?.total ?? 0),
    invoicesCount: Number(invoicesRow?.total ?? 0),
    partsConsumed: Number(partsRow?.total ?? 0),
  };
}

export async function getCustomerOutstanding() {
  const rows = await db
    .select({
      customerId: customersTable.id,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
      dueAmount: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
    })
    .from(invoices)
    .innerJoin(customersTable, eq(invoices.customerId, customersTable.id))
    .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES]))
    .groupBy(customersTable.id, customersTable.name, customersTable.phone)
    .orderBy(sql`sum(${invoices.dueAmount}) desc`);

  return rows
    .filter((r: any) => Number(r.dueAmount) > 0)
    .map((r: any) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      dueAmount: Number(r.dueAmount),
    }));
}

export async function getDashboard() {
  const day = periodStart("daily");
  const now = new Date();

  const [todayBilled] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
    .from(invoices)
    .where(and(gte(invoices.createdAt, day), lt(invoices.createdAt, now)));
  const [todayCollected] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(gte(payments.createdAt, day), lt(payments.createdAt, now)));
  const [outstanding] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
    })
    .from(invoices)
    .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES]));
  const [activeJobs] = await db
    .select({ total: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, "OPEN"));
  const [completedToday] = await db
    .select({ total: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "COMPLETED"),
        gte(jobs.completedAt ?? jobs.createdAt, day),
      ),
    );

  const shop = await db
    .select()
    .from(inventoryLocations)
    .where(eq(inventoryLocations.code, "SHOP"))
    .limit(1);
  const shopId = shop[0]?.id;

  const lowStock = await db
    .select({
      id: parts.id,
      name: parts.name,
      partNumber: parts.partNumber,
      unit: parts.unit,
      minimumShopStock: parts.minimumShopStock,
      shopStock: sql<number>`coalesce(${inventoryBalances.quantity}, 0)`,
    })
    .from(parts)
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.partId, parts.id),
        eq(inventoryBalances.locationId, shopId ?? ""),
      ),
    )
    .where(
      and(
        eq(parts.isArchived, false),
        sql`coalesce(${inventoryBalances.quantity}, 0) < ${parts.minimumShopStock}`,
      ),
    )
    .orderBy(sql`coalesce(${inventoryBalances.quantity}, 0)`)
    .limit(10);

  const warehouse = await db
    .select()
    .from(inventoryLocations)
    .where(eq(inventoryLocations.code, "WAREHOUSE"))
    .limit(1);
  const warehouseId = warehouse[0]?.id;

  const warehouseBalances = await db
    .select({
      partId: inventoryBalances.partId,
      quantity: inventoryBalances.quantity,
    })
    .from(inventoryBalances)
    .where(eq(inventoryBalances.locationId, warehouseId ?? ""));
  const whMap = new Map(warehouseBalances.map((b: any) => [b.partId, b.quantity]));

  const lowStockRows = lowStock.map((r: any) => ({
    ...r,
    shopStock: Number(r.shopStock),
    warehouseStock: whMap.get(r.id) ?? 0,
  }));

  const activeJobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      complaint: jobs.complaint,
      status: jobs.status,
      createdAt: jobs.createdAt,
      customerName: customersTable.name,
      vehicleType: vehicles.vehicleType,
    })
    .from(jobs)
    .innerJoin(customersTable, eq(jobs.customerId, customersTable.id))
    .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
    .where(eq(jobs.status, "OPEN"))
    .orderBy(desc(jobs.createdAt))
    .limit(10);

  const recentInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      createdAt: invoices.createdAt,
      customerName: customersTable.name,
    })
    .from(invoices)
    .innerJoin(customersTable, eq(invoices.customerId, customersTable.id))
    .orderBy(desc(invoices.createdAt))
    .limit(5);

  return {
    summary: {
      todayBilled: Number(todayBilled?.total ?? 0),
      todayCollected: Number(todayCollected?.total ?? 0),
      outstanding: Number(outstanding?.total ?? 0),
      activeJobs: Number(activeJobs?.total ?? 0),
      completedToday: Number(completedToday?.total ?? 0),
    },
    lowStock: lowStockRows,
    activeJobs: activeJobRows,
    recentInvoices,
  };
}