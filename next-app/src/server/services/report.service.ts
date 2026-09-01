import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  customers as customersTable,
  invoiceItems,
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
import { PAYMENT_METHODS } from "@/lib/format";
import { OUTSTANDING_INVOICE_STATUSES } from "./invoice.service";
import { getLastTransfer, getLowStock } from "./inventory.service";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

/**
 * How many rows each dashboard feed carries.
 *
 * The dashboard is a set of "here is the top of the pile, go and see the
 * rest" summaries, not a set of lists. Every section pairs this with a total
 * and a link out, so the cap never hides the size of the problem — it only
 * declines to render it.
 */
const DASHBOARD_LIST_ROWS = 4;

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

/**
 * Jobs closed since `start` — the one predicate, used by every figure that
 * counts completed work.
 *
 * The `coalesce` is the point. This was written as
 * `gte(jobs.completedAt ?? jobs.createdAt, start)`, which reads like a
 * fallback and is not one: `??` tests the *column object*, which is never
 * nullish, so the right-hand side was dead and a COMPLETED job with a null
 * `completed_at` — anything closed before that column existed, or by a direct
 * UPDATE — was silently uncounted.
 *
 * The bound is bound as an ISO string with an explicit cast rather than as a
 * `Date`. Once the left side is a raw `sql` expression drizzle has no column
 * to take a type from, so it sends the parameter untyped and Postgres parses
 * it as a bare literal — dropping sub-second precision, which is the same trap
 * documented at `getPartsUsage` below.
 */
const completedSince = (start: Date) =>
  and(
    eq(jobs.status, "COMPLETED"),
    sql`coalesce(${jobs.completedAt}, ${jobs.createdAt}) >= ${start.toISOString()}::timestamptz`,
  );

export async function getReport(period: ReportPeriod) {
  const start = periodStart(period);
  const now = new Date();

  // Six independent aggregates. Awaiting them one at a time cost six
  // sequential round trips to the database; on a remote Postgres that is
  // six times the network latency for no reason. They share no state, so
  // they go out together.
  //
  // Each window is open-ended at the top. These predicates used to carry
  // `lt(createdAt, now)` as well, with `now` captured before the queries went
  // out — so a row written between that capture and the query landing fell
  // outside "today", and an invoice raised while the page loaded went missing
  // from the day's total. Nothing is created in the future; the upper bound
  // only ever excluded rows that belonged.
  const [
    [invoiceRow],
    paymentRows,
    [jobsRow],
    [outstandingRow],
    [partsRow],
    [splitRow],
    vehicleRows,
    [newCustomerRow],
  ] = await Promise.all([
    // Billed, the invoice count and the discount total in one pass. These were
    // two queries scanning identical rows under an identical WHERE; merging
    // them pays for one of the additions below.
    db
      .select({
        billed: sql<string>`coalesce(sum(${invoices.total}), 0)`,
        count: sql<number>`count(*)::int`,
        discount: sql<string>`coalesce(sum(${invoices.discount}), 0)`,
      })
      .from(invoices)
      .where(and(gte(invoices.createdAt, start), ne(invoices.status, "CANCELLED"))),
    // Grouped rather than summed, so the method breakdown and the `collected`
    // scalar come from one scan and cannot disagree — `collected` is now the
    // sum of these rows by construction.
    db
      .select({
        method: payments.paymentMethod,
        total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(gte(payments.createdAt, start))
      .groupBy(payments.paymentMethod),
    // Jobs closed, and how long they took. `avg` is null when nothing
    // qualifies, and stays null all the way to the UI — "average turnaround:
    // 0h" is a wrong number where "—" is an honest absence.
    //
    // The sample count is carried because `completedSince` admits rows with a
    // null completed_at (see its comment) which are counted here but cannot
    // contribute to the average. Without it the two figures look inconsistent
    // for no visible reason.
    db
      .select({
        total: sql<number>`count(*)::int`,
        avgHours: sql<
          number | null
        >`avg(extract(epoch from (${jobs.completedAt} - ${jobs.createdAt})) / 3600.0) filter (where ${jobs.completedAt} is not null)`,
        turnaroundSample: sql<number>`count(*) filter (where ${jobs.completedAt} is not null)::int`,
      })
      .from(jobs)
      .where(completedSince(start)),
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)` })
      .from(invoices)
      .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES])),
    // Units consumed and what they cost, off the one JOB_USAGE scan. The cost
    // column is the whole basis of the profit figure below.
    db
      .select({
        units: sql<number>`coalesce(sum(${stockMovements.quantity} * -1), 0)::int`,
        cost: sql<string>`coalesce(sum(${stockMovements.quantity} * -1 * ${stockMovements.unitCost}), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.movementType, "JOB_USAGE"),
          gte(stockMovements.createdAt, start),
        ),
      ),
    // Labour against parts. `lower()` is defensive: the app writes lowercase,
    // but item_type is a free varchar with no check constraint, so a stray
    // "Part" from any future import would otherwise vanish from the split
    // rather than announce itself.
    db
      .select({
        parts: sql<string>`coalesce(sum(${invoiceItems.totalPrice}) filter (where lower(${invoiceItems.itemType}) = 'part'), 0)`,
        labour: sql<string>`coalesce(sum(${invoiceItems.totalPrice}) filter (where lower(${invoiceItems.itemType}) = 'labour'), 0)`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(gte(invoices.createdAt, start), ne(invoices.status, "CANCELLED"))),
    // What came through the door, by vehicle. Windowed on when the job was
    // opened, not when it closed: this is an intake mix, and scoping it to
    // completion would make it disagree with the jobs-completed count beside
    // it while answering a different question.
    //
    // LEFT JOIN with an UNKNOWN bucket because jobs.vehicle_id is nullable —
    // an inner join would drop those jobs and leave the buckets not summing to
    // the total.
    db
      .select({
        vehicleType: sql<string>`coalesce(${vehicles.vehicleType}::text, 'UNKNOWN')`,
        count: sql<number>`count(*)::int`,
      })
      .from(jobs)
      .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .where(gte(jobs.createdAt, start))
      .groupBy(sql`coalesce(${vehicles.vehicleType}::text, 'UNKNOWN')`),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(customersTable)
      .where(gte(customersTable.createdAt, start)),
  ]);

  const billed = Number(invoiceRow?.billed ?? 0);
  const collected = paymentRows.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);

  // Revenue is the post-discount invoice total — the figure the customer
  // actually owes, and the same one reported as `billed`. Taking it from
  // invoice_items instead would be pre-discount and overstate profit by the
  // whole discount.
  //
  // This is MATERIALS margin, not gross margin: job_labour carries revenue
  // with no cost side, and the schema has no wages, no overhead and no rent.
  // The UI has to say so.
  const cogs = Number(partsRow?.cost ?? 0);
  const grossProfit = billed - cogs;

  const avgHours = jobsRow?.avgHours;

  return {
    period,
    start,
    end: now,
    billed,
    collected,
    discount: Number(invoiceRow?.discount ?? 0),
    outstanding: Number(outstandingRow?.total ?? 0),
    jobsCompleted: Number(jobsRow?.total ?? 0),
    invoicesCount: Number(invoiceRow?.count ?? 0),
    partsConsumed: Number(partsRow?.units ?? 0),
    cogs,
    grossProfit,
    newCustomers: Number(newCustomerRow?.total ?? 0),
    avgTurnaroundHours: avgHours == null ? null : Number(avgHours),
    turnaroundSample: Number(jobsRow?.turnaroundSample ?? 0),
    // Pre-discount, unlike `billed`, so these two will not sum to it. The UI
    // states the split's own total rather than implying it reconciles.
    revenueSplit: {
      labour: Number(splitRow?.labour ?? 0),
      parts: Number(splitRow?.parts ?? 0),
    },
    // Normalised to the full enum so the UI never has to handle a missing
    // bucket, and the order is stable across periods.
    paymentMix: PAYMENT_METHODS.map((method) => {
      const row = paymentRows.find((r: any) => r.method === method);
      return { method, total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
    }),
    vehicleMix: vehicleRows
      .map((r: any) => ({ vehicleType: r.vehicleType, count: Number(r.count ?? 0) }))
      .sort((a: any, b: any) => b.count - a.count),
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
 *   cost    — what those units were worth when they left the shelf, taken from
 *             the movement's own `unit_cost` snapshot rather than the part's
 *             price today, so re-pricing a part does not move last month's
 *             figure.
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
        cost: sql<string>`coalesce(sum(${stockMovements.quantity} * -1 * ${stockMovements.unitCost}), 0)`,
      })
      .from(stockMovements)
      .innerJoin(parts, eq(parts.id, stockMovements.partId))
      .where(
        and(
          eq(stockMovements.movementType, "JOB_USAGE"),
          gte(stockMovements.createdAt, start),
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

/**
 * Who owes money, biggest debtor first.
 *
 * `limit` is not decoration. The dashboard renders one full-height row per
 * customer under a "Customers →" link, and unbounded that section grew to
 * forty-five rows on a real book — longer than the rest of the page put
 * together, for a list whose job is to name the top few and hand off.
 * `/customers` still asks for the whole thing.
 *
 * The `> 0` test lives in HAVING rather than in JS afterwards, so a customer
 * whose outstanding invoices net to zero is never materialised at all.
 */
export async function getCustomerOutstanding(opts?: { limit?: number }) {
  const q = db
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
    .having(sql`sum(${invoices.dueAmount}) > 0`)
    .orderBy(sql`sum(${invoices.dueAmount}) desc`);

  const rows = await (opts?.limit ? q.limit(opts.limit) : q);

  return rows.map((r: any) => ({
    customerId: r.customerId,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    dueAmount: Number(r.dueAmount),
  }));
}

export async function getDashboard() {
  const day = periodStart("daily");

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
    [movementTotals],
    lastTransfer,
  ] = await Promise.all([
    // Cancelled invoices are excluded here exactly as they are in getReport.
    // Without it the dashboard's "Billed today" and the daily figure on
    // /reports disagreed by the value of anything cancelled that day, and the
    // two screens are read one after the other.
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(gte(invoices.createdAt, day), ne(invoices.status, "CANCELLED"))),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(gte(payments.createdAt, day)),
    // The amount owed and how many people owe it, off one scan. The list
    // beneath it names only the biggest few, so without the count the section
    // could not say what it was the top few *of*.
    db
      .select({
        total: sql<string>`coalesce(sum(${invoices.dueAmount}), 0)`,
        customers: sql<number>`count(distinct ${invoices.customerId}) filter (where ${invoices.dueAmount} > 0)::int`,
      })
      .from(invoices)
      .where(inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES])),
    // Open jobs, and how many of those have been open a week.
    //
    // The stale count used to be derived in JS from the ten rows fetched for
    // the list, so it silently saturated at ten — "10 over a week" on a board
    // of thirty-three was the limit talking, not the backlog.
    db
      .select({
        total: sql<number>`count(*)::int`,
        stale: sql<number>`count(*) filter (where ${jobs.createdAt} < now() - interval '7 days')::int`,
      })
      .from(jobs)
      .where(eq(jobs.status, "OPEN")),
    db.select({ total: sql<number>`count(*)` }).from(jobs).where(completedSince(day)),
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
        // Computed here rather than on the client, which would be measuring
        // against the phone's clock instead of the server's.
        ageDays: sql<number>`floor(extract(epoch from (now() - ${jobs.createdAt})) / 86400)::int`,
      })
      .from(jobs)
      .innerJoin(customersTable, eq(jobs.customerId, customersTable.id))
      .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .where(eq(jobs.status, "OPEN"))
      // Oldest first. Newest-first meant that past ten open jobs the list
      // showed the ten the owner had just written and dropped the ones that
      // had been sitting for weeks — precisely the rows worth surfacing. A job
      // opened this morning is still in their head; one open nine days is not.
      .orderBy(asc(jobs.createdAt))
      // Four, not ten. Ten rows of a thirty-three job board is the jobs page
      // embedded in the dashboard: long enough to scroll past, short enough to
      // be incomplete, so it served neither purpose. Four names the ones that
      // have waited longest and hands off to /jobs for the rest.
      .limit(DASHBOARD_LIST_ROWS),
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
      .where(ne(invoices.status, "CANCELLED"))
      .orderBy(desc(invoices.createdAt))
      .limit(DASHBOARD_LIST_ROWS),
    // Two questions off one scan of the movement ledger.
    //
    // stockPurchased: what the shelves cost to fill — every unit ever booked
    // in, valued at what it cost on the day it was booked in. This used to
    // join the part's *current* purchase price, so correcting a price changed
    // what the workshop had historically spent.
    //
    // cogsToday: what today's completed work took out of inventory, which is
    // the cost side of the day's margin. It rides the same scan through a
    // filtered aggregate rather than paying for a round trip of its own.
    db
      .select({
        stockPurchased: sql<string>`coalesce(sum(${stockMovements.quantity} * ${stockMovements.unitCost}) filter (where ${stockMovements.movementType} = 'STOCK_IN'), 0)`,
        cogsToday: sql<string>`coalesce(sum(${stockMovements.quantity} * -1 * ${stockMovements.unitCost}) filter (where ${stockMovements.movementType} = 'JOB_USAGE' and ${stockMovements.createdAt} >= ${day.toISOString()}::timestamptz), 0)`,
      })
      .from(stockMovements),
    getLastTransfer(),
  ]);

  const shopId = shop[0]?.id;
  const warehouseId = warehouse[0]?.id;

  // Wave 2 — the queries that genuinely need the location ids above.
  //
  // Low stock is not computed here. This function used to carry its own
  // shop-only list, its own shop-only count and a whole extra query fetching
  // every warehouse balance just to decorate the rows — four round trips, and
  // a definition of "low" that disagreed with the page the tile links to.
  // getLowStock already answers the question across both locations; handing it
  // the ids saves it re-looking them up, and skipping the 30-day usage figure
  // saves a query for a column the dashboard does not render.
  const [lowStockRows, stockByLocation] = await Promise.all([
    getLowStock({
      locations: { shopId: shopId ?? "", warehouseId: warehouseId ?? "" },
      withUsage: false,
    }),
    // Units and their purchase value, per location, in one grouped pass —
    // the alternative was two more round trips for figures that share a row
    // source. Archived parts are excluded so a retired line does not keep
    // inflating what the shelves are worth.
    //
    // Deliberately still valued at the part's CURRENT purchase price, unlike
    // `stockPurchased` above. This is stock on hand, and a balance row carries
    // no cost lineage — there is no movement to take a snapshot from, and
    // costing the units sitting there would need layers this schema has not
    // got. "What the shelves would cost to replace today" is the honest
    // reading of the figure, and it is what the tile says: at cost.
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

  const stockAt = (locationId: string | undefined) =>
    stockByLocation.find((r: any) => r.locationId === locationId);
  const shopRow = stockAt(shopId);
  const warehouseRow = stockAt(warehouseId);

  const shopUnits = Number(shopRow?.units ?? 0);
  const shopStockValue = Number(shopRow?.value ?? 0);
  const warehouseUnits = Number(warehouseRow?.units ?? 0);
  const warehouseStockValue = Number(warehouseRow?.value ?? 0);

  return {
    summary: {
      todayBilled: Number(todayBilled?.total ?? 0),
      todayCollected: Number(todayCollected?.total ?? 0),
      outstanding: Number(outstanding?.total ?? 0),
      outstandingCustomers: Number(outstanding?.customers ?? 0),
      activeJobs: Number(activeJobs?.total ?? 0),
      completedToday: Number(completedToday?.total ?? 0),
      // Open jobs that have been open a week — counted across the whole board,
      // not across the handful of rows the list happens to carry.
      staleJobs: Number(activeJobs?.stale ?? 0),
      // "Low" now means under a minimum at EITHER location, matching
      // /inventory/low-stock and the nav badge. The split is carried alongside
      // so the tile can say which side is short rather than leaving a single
      // number to be read as "shop".
      lowStockCount: lowStockRows.length,
      lowShopCount: lowStockRows.filter((r: any) => r.shopShort).length,
      lowWarehouseCount: lowStockRows.filter((r: any) => r.warehouseShort).length,
      // Short in the warehouse while the shop floor is fine: a re-order
      // prompt for the week, not something that stops a job today, so the
      // dashboard counts it rather than listing it.
      warehouseOnlyCount: lowStockRows.filter((r: any) => !r.shopShort && r.warehouseShort)
        .length,
      stockPurchased: Number(movementTotals?.stockPurchased ?? 0),
      // Materials margin on today's work — see the note in getReport. Revenue
      // is windowed on invoices.createdAt and cost on the movement's
      // createdAt; both rows are written inside the same completeJob
      // transaction, so they can only fall in different days if one straddles
      // midnight.
      cogsToday: Number(movementTotals?.cogsToday ?? 0),
      profitToday:
        Number(todayBilled?.total ?? 0) - Number(movementTotals?.cogsToday ?? 0),
      shopUnits,
      shopStockValue,
      warehouseUnits,
      warehouseStockValue,
      // Summed here rather than on the client: the grouped query above is
      // already restricted to these two locations, so this is the whole of
      // stock on hand, and it stays that way if a third location is added.
      stockUnits: shopUnits + warehouseUnits,
      stockValue: shopStockValue + warehouseStockValue,
    },
    // The listed rows stay shop-short only. A shop shortage stops a job today;
    // a warehouse shortage is a re-order for this week, and interleaving the
    // two buries the urgent ones.
    lowStock: lowStockRows.filter((r: any) => r.shopShort).slice(0, DASHBOARD_LIST_ROWS),
    activeJobs: activeJobRows,
    recentInvoices,
    lastTransfer,
  };
}