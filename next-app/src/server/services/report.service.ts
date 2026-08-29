import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  customers as customersTable,
  invoices,
  jobParts,
  jobs,
  payments,
  stockMovements,
  parts,
  inventoryLocations,
  inventoryBalances,
  vehicles,
} from "@/server/db/schema";
import { OUTSTANDING_INVOICE_STATUSES } from "./invoice.service";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

function periodStart(period: ReportPeriod) {
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

export async function getReport(period: ReportPeriod) {
  const start = periodStart(period);
  const now = new Date();

  // Six independent aggregates. Awaiting them one at a time cost six
  // sequential round trips to the database; on a remote Postgres that is
  // six times the network latency for no reason. They share no state, so
  // they go out together.
  const [
    [billedRow],
    [collectedRow],
    [jobsRow],
    [invoicesRow],
    [outstandingRow],
    [partsRow],
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, start),
          lt(invoices.createdAt, now),
          ne(invoices.status, "CANCELLED"),
        ),
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(gte(payments.createdAt, start), lt(payments.createdAt, now))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "COMPLETED"),
          gte(jobs.completedAt ?? jobs.createdAt, start),
        ),
      ),
    db
      .select({ total: sql<number>`count(*)` })
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, start),
          lt(invoices.createdAt, now),
          ne(invoices.status, "CANCELLED"),
        ),
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)` })
      .from(invoices)
      .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES])),
    db
      .select({ total: sql<number>`coalesce(sum(${stockMovements.quantity} * -1), 0)` })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.movementType, "JOB_USAGE"),
          gte(stockMovements.createdAt, start),
        ),
      ),
  ]);

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

/**
 * What the workshop consumed, broken down by part.
 *
 * Built on `stock_movements` rather than `job_parts` on purpose: the ledger is
 * what actually left the shelf, and `partsConsumed` in `getReport` already
 * sums the very same rows — so this breakdown can never disagree with the
 * total printed above it.
 *
 * That also fixes the meaning of "today". A JOB_USAGE row is written when a
 * job is *completed* (see `completeJob`), not when a part is added to an open
 * one, so this is "parts on jobs closed in the period". Parts sitting on a job
 * that is still open have not left the shelf and are deliberately absent.
 *
 * Two figures per part, because they are two different questions:
 *   cost    — purchase price × qty: what today's work took out of inventory.
 *   charged — what the customer was billed for those parts.
 * They diverge by the margin, which is the point of showing both.
 */
export async function getPartsUsage(period: ReportPeriod, opts?: { limit?: number }) {
  const start = periodStart(period);
  const now = new Date();

  // Two passes rather than one join. `job_parts` can legitimately hold more
  // than one row for the same part on one job, and joining it to the movement
  // rows would multiply the quantities — the figure that has to stay exact.
  const [usageRows, chargedRows] = await Promise.all([
    db
      .select({
        partId: parts.id,
        name: parts.name,
        partNumber: parts.partNumber,
        unit: parts.unit,
        // JOB_USAGE quantities are stored negative, being a deduction.
        quantity: sql<number>`coalesce(sum(${stockMovements.quantity} * -1), 0)::int`,
        cost: sql<string>`coalesce(sum(${stockMovements.quantity} * -1 * ${parts.purchasePrice}), 0)`,
      })
      .from(stockMovements)
      .innerJoin(parts, eq(parts.id, stockMovements.partId))
      .where(
        and(
          eq(stockMovements.movementType, "JOB_USAGE"),
          gte(stockMovements.createdAt, start),
          lt(stockMovements.createdAt, now),
        ),
      )
      .groupBy(parts.id, parts.name, parts.partNumber, parts.unit)
      .orderBy(sql`sum(${stockMovements.quantity} * -1) desc`),

    // Scoped by the very movement rows above — `referenceId` on a JOB_USAGE
    // movement is the job that consumed the part — rather than by re-deriving
    // the window from `jobs.completedAt`.
    //
    // Two reasons. It cannot drift: whatever set of jobs the quantity column
    // covers, the charged column covers exactly the same ones. And a second
    // date predicate here would have to compare against
    // `coalesce(completedAt, createdAt)`, a raw SQL expression — which loses
    // the column's timestamp type, so drizzle binds the bound as an untyped
    // literal and the comparison silently drops sub-second precision. That
    // made this figure wrong whenever two jobs closed inside the same second.
    db
      .select({
        partId: jobParts.partId,
        charged: sql<string>`coalesce(sum(${jobParts.totalPrice}), 0)`,
      })
      .from(jobParts)
      .where(
        inArray(
          jobParts.jobId,
          db
            .select({ jobId: stockMovements.referenceId })
            .from(stockMovements)
            .where(
              and(
                eq(stockMovements.movementType, "JOB_USAGE"),
                eq(stockMovements.referenceType, "JOB"),
                gte(stockMovements.createdAt, start),
                lt(stockMovements.createdAt, now),
              ),
            ),
        ),
      )
      .groupBy(jobParts.partId),
  ]);

  const chargedByPart = new Map<string, number>(
    chargedRows.map((r: any) => [r.partId, Number(r.charged ?? 0)]),
  );

  const rows = usageRows.map((r: any) => ({
    partId: r.partId,
    name: r.name,
    partNumber: r.partNumber,
    unit: r.unit,
    quantity: Number(r.quantity ?? 0),
    cost: Number(r.cost ?? 0),
    charged: chargedByPart.get(r.partId) ?? 0,
  }));

  const totals = rows.reduce(
    (acc: { quantity: number; cost: number; charged: number }, r: any) => ({
      quantity: acc.quantity + r.quantity,
      cost: acc.cost + r.cost,
      charged: acc.charged + r.charged,
    }),
    { quantity: 0, cost: 0, charged: 0 },
  );

  return {
    period,
    start,
    end: now,
    // Totals are computed across every part, then the list is trimmed — so a
    // limited response still reports the true totals rather than the sum of
    // the rows it happens to be carrying.
    totals: { ...totals, distinctParts: rows.length },
    rows: opts?.limit ? rows.slice(0, opts.limit) : rows,
  };
}

/**
 * How many units of one part have been consumed over each of the three windows
 * the part page shows. One grouped pass, not three counts.
 */
export async function getPartUsage(partId: string) {
  const [row] = await db
    .select({
      today: sql<number>`coalesce(sum(case when ${stockMovements.createdAt} >= ${periodStart("daily")} then ${stockMovements.quantity} * -1 else 0 end), 0)::int`,
      week: sql<number>`coalesce(sum(case when ${stockMovements.createdAt} >= ${periodStart("weekly")} then ${stockMovements.quantity} * -1 else 0 end), 0)::int`,
      month: sql<number>`coalesce(sum(case when ${stockMovements.createdAt} >= ${periodStart("monthly")} then ${stockMovements.quantity} * -1 else 0 end), 0)::int`,
    })
    .from(stockMovements)
    .where(
      and(eq(stockMovements.partId, partId), eq(stockMovements.movementType, "JOB_USAGE")),
    );

  return {
    today: Number(row?.today ?? 0),
    week: Number(row?.week ?? 0),
    month: Number(row?.month ?? 0),
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

  // Wave 1 — everything that depends on nothing. Previously these were nine
  // separate awaits, so the dashboard paid nine round trips of network
  // latency before it could even start on stock levels.
  const [
    [todayBilled],
    [todayCollected],
    [outstanding],
    [activeJobs],
    [completedToday],
    shop,
    warehouse,
    activeJobRows,
    recentInvoices,
    [stockPurchased],
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(gte(invoices.createdAt, day), lt(invoices.createdAt, now))),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(gte(payments.createdAt, day), lt(payments.createdAt, now))),
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)` })
      .from(invoices)
      .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES])),
    db
      .select({ total: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, "OPEN")),
    db
      .select({ total: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "COMPLETED"),
          gte(jobs.completedAt ?? jobs.createdAt, day),
        ),
      ),
    db
      .select()
      .from(inventoryLocations)
      .where(eq(inventoryLocations.code, "SHOP"))
      .limit(1),
    db
      .select()
      .from(inventoryLocations)
      .where(eq(inventoryLocations.code, "WAREHOUSE"))
      .limit(1),
    db
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
      .limit(10),
    db
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
      .limit(5),
    // What the shelves cost to fill: every unit that has ever been booked in,
    // valued at the part's purchase price. The price is the current one, not a
    // per-receipt snapshot — stock_movements carries no cost column — so this
    // is "what this stock costs to buy today", which is the figure a workshop
    // owner actually re-orders against.
    db
      .select({
        total: sql<string>`coalesce(sum(${stockMovements.quantity} * ${parts.purchasePrice}), 0)`,
      })
      .from(stockMovements)
      .innerJoin(parts, eq(parts.id, stockMovements.partId))
      .where(eq(stockMovements.movementType, "STOCK_IN")),
  ]);

  const shopId = shop[0]?.id;
  const warehouseId = warehouse[0]?.id;

  // Wave 2 — the queries that genuinely need the location ids above.
  const [lowStock, lowStockTotal, warehouseBalances, stockByLocation] = await Promise.all([
    db
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
      .limit(10),
    // The rows above stop at ten because that is all the dashboard lists. The
    // headline count must not: "10 low" when twenty parts are under their
    // minimum is a number the owner would re-order against and be wrong.
    db
      .select({ total: sql<number>`count(*)::int` })
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
      ),
    db
      .select({
        partId: inventoryBalances.partId,
        quantity: inventoryBalances.quantity,
      })
      .from(inventoryBalances)
      .where(eq(inventoryBalances.locationId, warehouseId ?? "")),
    // Units and their purchase value, per location, in one grouped pass —
    // the alternative was two more round trips for figures that share a row
    // source. Archived parts are excluded so a retired line does not keep
    // inflating what the shelves are worth.
    db
      .select({
        locationId: inventoryBalances.locationId,
        units: sql<number>`coalesce(sum(${inventoryBalances.quantity}), 0)`,
        value: sql<string>`coalesce(sum(${inventoryBalances.quantity} * ${parts.purchasePrice}), 0)`,
      })
      .from(inventoryBalances)
      .innerJoin(parts, eq(parts.id, inventoryBalances.partId))
      .where(
        and(
          eq(parts.isArchived, false),
          inArray(inventoryBalances.locationId, [shopId ?? "", warehouseId ?? ""]),
        ),
      )
      .groupBy(inventoryBalances.locationId),
  ]);

  const whMap = new Map(warehouseBalances.map((b: any) => [b.partId, b.quantity]));

  const lowStockRows = lowStock.map((r: any) => ({
    ...r,
    shopStock: Number(r.shopStock),
    warehouseStock: whMap.get(r.id) ?? 0,
  }));

  const stockAt = (locationId: string | undefined) =>
    stockByLocation.find((r: any) => r.locationId === locationId);
  const shopRow = stockAt(shopId);
  const warehouseRow = stockAt(warehouseId);

  return {
    summary: {
      todayBilled: Number(todayBilled?.total ?? 0),
      todayCollected: Number(todayCollected?.total ?? 0),
      outstanding: Number(outstanding?.total ?? 0),
      activeJobs: Number(activeJobs?.total ?? 0),
      completedToday: Number(completedToday?.total ?? 0),
      lowStockCount: Number(lowStockTotal[0]?.total ?? 0),
      stockPurchased: Number(stockPurchased?.total ?? 0),
      shopUnits: Number(shopRow?.units ?? 0),
      shopStockValue: Number(shopRow?.value ?? 0),
      warehouseUnits: Number(warehouseRow?.units ?? 0),
      warehouseStockValue: Number(warehouseRow?.value ?? 0),
    },
    lowStock: lowStockRows,
    activeJobs: activeJobRows,
    recentInvoices,
  };
}