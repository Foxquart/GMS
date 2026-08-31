import { aliasedTable, and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  categories,
  inventoryBalances,
  inventoryLocations,
  parts,
  stockMovements,
  stockTransferItems,
  stockTransfers,
  subCategories,
  suppliers,
  type movementTypeEnum,
} from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";

// ─── Location helpers ────────────────────────────────────────────────
export async function getLocationByCode(code: string) {
  const [loc] = await db
    .select()
    .from(inventoryLocations)
    .where(eq(inventoryLocations.code, code))
    .limit(1);
  if (!loc) {
    // Not an ApiError: this is a setup fault, not something the user did or
    // can act on. handleError logs it against a reference and shows a
    // generic message rather than leaking the location code.
    throw new Error(`Inventory location "${code}" is missing — database not seeded?`);
  }
  return loc;
}

// ─── Balance helpers ─────────────────────────────────────────────────
async function getBalance(partId: string, locationId: string) {
  const [bal] = await db
    .select()
    .from(inventoryBalances)
    .where(
      and(
        eq(inventoryBalances.partId, partId),
        eq(inventoryBalances.locationId, locationId),
      ),
    )
    .limit(1);
  return bal ?? null;
}

export async function getPartBalance(partId: string, locationCode: string) {
  const loc = await getLocationByCode(locationCode);
  const bal = await getBalance(partId, loc.id);
  return bal?.quantity ?? 0;
}

export async function getPartBalances(partId: string) {
  const rows = await db
    .select({
      locationId: inventoryBalances.locationId,
      code: inventoryLocations.code,
      name: inventoryLocations.name,
      quantity: inventoryBalances.quantity,
    })
    .from(inventoryBalances)
    .innerJoin(
      inventoryLocations,
      eq(inventoryBalances.locationId, inventoryLocations.id),
    )
    .where(eq(inventoryBalances.partId, partId));
  return rows;
}

// ─── Stock mutations (internal) ──────────────────────────────────────
async function changeStock(
  tx: any,
  partId: string,
  locationId: string,
  delta: number,
  movementType: (typeof movementTypeEnum.enumValues)[number],
  reference?: { type: string; id?: string },
  notes?: string,
) {
  const existing = await tx
    .select()
    .from(inventoryBalances)
    .where(
      and(
        eq(inventoryBalances.partId, partId),
        eq(inventoryBalances.locationId, locationId),
      ),
    )
    .limit(1);

  if (existing && existing[0]) {
    const newQty = existing[0].quantity + delta;
    if (newQty < 0) {
      throw new ApiError(
        409,
        "Not enough stock. Move stock from Warehouse or restock first.",
        "INSUFFICIENT_STOCK",
      );
    }
    await tx
      .update(inventoryBalances)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(inventoryBalances.id, existing[0].id));
  } else {
    if (delta < 0) {
      throw new ApiError(409, "Not enough stock.", "INSUFFICIENT_STOCK");
    }
    await tx.insert(inventoryBalances).values({
      partId,
      locationId,
      quantity: delta,
    });
  }

  await tx.insert(stockMovements).values({
    partId,
    locationId,
    movementType,
    quantity: delta,
    // See the column comment in schema.ts. This is the second of the two
    // writers of this table — the other is `changeBalance` in
    // invoice.service.ts, which books JOB_USAGE. Both must set this, or the
    // movement types written here (STOCK_IN above all) land at zero cost and
    // "what the shelves cost to fill" silently reads as nothing.
    unitCost: sql`coalesce((select ${parts.purchasePrice} from ${parts} where ${parts.id} = ${partId}), '0')`,
    referenceType: reference?.type,
    referenceId: reference?.id,
    notes,
  });
}

// ─── Categories ──────────────────────────────────────────────────────
// Category logic now lives in category.service.ts; re-exported here so existing
// imports of these helpers keep working.
export {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
  DEFAULT_CATEGORIES,
} from "./category.service";

// ─── Suppliers ───────────────────────────────────────────────────────
export async function listSuppliers() {
  return db.select().from(suppliers).orderBy(suppliers.name);
}

export async function createSupplier(input: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const [row] = await db.insert(suppliers).values(input).returning();
  return row;
}

export async function updateSupplier(
  id: string,
  input: { name?: string; phone?: string; address?: string; notes?: string },
) {
  const [row] = await db
    .update(suppliers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Supplier not found", "NOT_FOUND");
  return row;
}

// ─── Parts ───────────────────────────────────────────────────────────
/**
 * The two stock orderings name their location outright rather than following a
 * separate "which location" lens. A hidden lens meant "stock low to high"
 * silently meant a different thing depending on a control somewhere else on
 * the page.
 */
export type PartSort = "NAME" | "PRICE_ASC" | "PRICE_DESC" | "SHOP_ASC" | "WAREHOUSE_ASC";
/**
 * `BELOW` is what the location tiles count and filter by — everything under
 * its minimum, empty shelves included. It deliberately overlaps `OUT`: the
 * tile shows one number and tapping it must return exactly that many rows, so
 * the count and the filter have to share a definition.
 *
 * `LOW` and `OUT` stay disjoint for callers that need to tell "running down"
 * from "gone".
 */
export type PartStockFilter = "ALL" | "BELOW" | "LOW" | "OUT";
export type StockLocationCode = "SHOP" | "WAREHOUSE";

/** Rows per page. Small enough that a phone renders a page without stuttering. */
export const PARTS_PAGE_SIZE = 24;

/**
 * One page of parts, with the ordering and stock filter applied in the
 * database.
 *
 * This used to return up to 500 rows in one array and let the browser sort and
 * filter them. That was wrong in a way that did not look wrong: a workshop
 * with more than 500 parts simply never saw the rest, and because the cut was
 * made in *name* order before the client sorted, "price low to high" showed
 * the cheapest of the alphabetical first 500 rather than the cheapest part in
 * the catalogue. Same for "stock low to high", which is the one a restocking
 * decision leans on hardest.
 *
 * The two balances are left-joined rather than fetched as correlated
 * subqueries so `shopStock` and `warehouseStock` are real columns — a subquery
 * in the select list cannot be referenced from WHERE, which is what filtering
 * and sorting on stock both need.
 */
export async function listParts(opts: {
  q?: string;
  categoryId?: string;
  subCategoryId?: string;
  includeArchived?: boolean;
  sort?: PartSort;
  /** Which location the `stock` filter is measured against. */
  location?: StockLocationCode;
  stock?: PartStockFilter;
  page?: number;
  pageSize?: number;
}) {
  const shopBal = aliasedTable(inventoryBalances, "shop_bal");
  const whBal = aliasedTable(inventoryBalances, "wh_bal");
  const shopLoc = aliasedTable(inventoryLocations, "shop_loc");
  const whLoc = aliasedTable(inventoryLocations, "wh_loc");

  const shopQty = sql<number>`coalesce(${shopBal.quantity}, 0)`;
  const whQty = sql<number>`coalesce(${whBal.quantity}, 0)`;

  const location = opts.location ?? "SHOP";
  const activeQty = location === "SHOP" ? shopQty : whQty;
  const activeMin = location === "SHOP" ? parts.minimumShopStock : parts.minimumWarehouseStock;

  const conditions = [];
  if (!opts.includeArchived) {
    conditions.push(eq(parts.isArchived, false));
  }
  if (opts.categoryId) {
    conditions.push(eq(parts.categoryId, opts.categoryId));
  }
  if (opts.subCategoryId) {
    conditions.push(eq(parts.subCategoryId, opts.subCategoryId));
  }
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${parts.name}) like ${like} or lower(coalesce(${parts.partNumber},'')) like ${like} or lower(coalesce(${parts.brand},'')) like ${like})`,
    );
  }
  // "Low" means under the minimum but not yet empty, so the two are disjoint —
  // a part with nothing on the shelf belongs in Out, and counting it twice
  // would make the two figures add up to more than the catalogue.
  if (opts.stock === "BELOW") {
    conditions.push(sql`${activeQty} < ${activeMin}`);
  } else if (opts.stock === "LOW") {
    conditions.push(sql`${activeQty} > 0 and ${activeQty} < ${activeMin}`);
  } else if (opts.stock === "OUT") {
    conditions.push(sql`${activeQty} <= 0`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  // Every ordering ends on name so a page boundary cannot shuffle rows between
  // requests — without a unique-ish tiebreak, two parts at the same price can
  // swap pages and one of them is never seen.
  const orderBy =
    opts.sort === "PRICE_ASC"
      ? [sql`${parts.sellingPrice} asc`, parts.name]
      : opts.sort === "PRICE_DESC"
        ? [sql`${parts.sellingPrice} desc`, parts.name]
        : opts.sort === "SHOP_ASC"
          ? [sql`${shopQty} asc`, parts.name]
          : opts.sort === "WAREHOUSE_ASC"
            ? [sql`${whQty} asc`, parts.name]
            : [parts.name];

  const pageSize = Math.min(Math.max(1, opts.pageSize ?? PARTS_PAGE_SIZE), 100);
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));

  const withJoins = <T extends { from: any }>(query: any) =>
    query
      .from(parts)
      .leftJoin(shopLoc, sql`${shopLoc.code} = 'SHOP'`)
      .leftJoin(whLoc, sql`${whLoc.code} = 'WAREHOUSE'`)
      .leftJoin(shopBal, and(eq(shopBal.partId, parts.id), eq(shopBal.locationId, shopLoc.id)))
      .leftJoin(whBal, and(eq(whBal.partId, parts.id), eq(whBal.locationId, whLoc.id))) as T;

  const [countRow] = await withJoins<any>(
    db.select({ total: sql<number>`count(*)::int` }),
  ).where(where);

  const total = Number(countRow?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // A filter change can shrink the list under the page you were on; clamping
  // returns the last real page instead of a blank one.
  const page = Math.min(requestedPage, pageCount);

  const rows = await withJoins<any>(
    db.select({
      id: parts.id,
      name: parts.name,
      partNumber: parts.partNumber,
      brand: parts.brand,
      categoryId: parts.categoryId,
      categoryName: categories.name,
      subCategoryId: parts.subCategoryId,
      subCategoryName: subCategories.name,
      sellingPrice: parts.sellingPrice,
      purchasePrice: parts.purchasePrice,
      minimumShopStock: parts.minimumShopStock,
      minimumWarehouseStock: parts.minimumWarehouseStock,
      unit: parts.unit,
      isArchived: parts.isArchived,
      shopStock: shopQty,
      warehouseStock: whQty,
    }),
  )
    .leftJoin(categories, eq(parts.categoryId, categories.id))
    .leftJoin(subCategories, eq(parts.subCategoryId, subCategories.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageSize, pageCount };
}

export async function getPart(id: string) {
  const [row] = await db
    .select()
    .from(parts)
    .where(eq(parts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPart(input: {
  name: string;
  categoryId?: string;
  /** Only meaningful with `categoryId`; the route validates the pair. */
  subCategoryId?: string;
  supplierId?: string;
  partNumber?: string;
  brand?: string;
  purchasePrice?: string;
  sellingPrice?: string;
  minimumShopStock?: number;
  minimumWarehouseStock?: number;
  unit?: string;
  barcode?: string;
  description?: string;
  attributes?: { label: string; value: string }[];
  /**
   * Opening stock, counted at the moment the part is added. Without this the
   * only way to get a number onto the shelf was to save the part, then run
   * Stock In, then Adjust — three steps to record something the user already
   * knew when they started typing.
   */
  openingShopStock?: number;
  openingWarehouseStock?: number;
}) {
  const { openingShopStock, openingWarehouseStock, ...partInput } = input;
  const shopQty = Math.max(0, Math.floor(openingShopStock ?? 0));
  const warehouseQty = Math.max(0, Math.floor(openingWarehouseStock ?? 0));

  const shop = shopQty > 0 ? await getLocationByCode("SHOP") : null;
  const warehouse = warehouseQty > 0 ? await getLocationByCode("WAREHOUSE") : null;

  let created: any;
  await db.transaction(async (tx: any) => {
    const [row] = await tx
      .insert(parts)
      .values({ ...partInput, attributes: normalizeAttributes(input.attributes) })
      .returning();
    created = row;

    // Recorded as STOCK_IN so the movement history explains where the
    // opening figure came from, rather than stock appearing from nowhere.
    if (shop) {
      await changeStock(tx, row.id, shop.id, shopQty, "STOCK_IN", undefined, "Opening stock");
    }
    if (warehouse) {
      await changeStock(
        tx, row.id, warehouse.id, warehouseQty, "STOCK_IN", undefined, "Opening stock",
      );
    }
  });
  return created;
}

/**
 * Custom part fields arrive straight from a form, so drop blank rows, trim,
 * and cap the count — this lands in jsonb and is rendered back verbatim.
 */
export function normalizeAttributes(
  input: unknown,
): { label: string; value: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((a): a is { label: unknown; value: unknown } => !!a && typeof a === "object")
    .map((a) => ({
      label: String(a.label ?? "").trim().slice(0, 60),
      value: String(a.value ?? "").trim().slice(0, 200),
    }))
    .filter((a) => a.label !== "" || a.value !== "")
    .slice(0, 25);
}

export async function updatePart(id: string, input: Record<string, unknown>) {
  const updates =
    input.attributes !== undefined
      ? { ...input, attributes: normalizeAttributes(input.attributes) }
      : input;
  const [row] = await db
    .update(parts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(parts.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Part not found", "NOT_FOUND");
  return row;
}

// ─── Stock in / Adjust ───────────────────────────────────────────────
export async function stockIn(input: {
  partId: string;
  quantity: number;
  locationCode: "SHOP" | "WAREHOUSE";
  supplierId?: string;
  notes?: string;
}) {
  const loc = await getLocationByCode(input.locationCode);
  const part = await getPart(input.partId);
  if (!part) throw new ApiError(404, "Part not found", "NOT_FOUND");

  await db.transaction(async (tx: any) => {
    await changeStock(
      tx,
      input.partId,
      loc.id,
      input.quantity,
      "STOCK_IN",
      input.supplierId ? { type: "SUPPLIER", id: input.supplierId } : undefined,
      input.notes,
    );
  });
  return { partId: input.partId, locationCode: input.locationCode, quantity: input.quantity };
}

export async function adjustStock(input: {
  partId: string;
  locationCode: "SHOP" | "WAREHOUSE";
  newQuantity: number;
  notes?: string;
}) {
  const loc = await getLocationByCode(input.locationCode);
  const part = await getPart(input.partId);
  if (!part) throw new ApiError(404, "Part not found", "NOT_FOUND");

  await db.transaction(async (tx: any) => {
    const [current] = await tx
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.partId, input.partId),
          eq(inventoryBalances.locationId, loc.id),
        ),
      )
      .limit(1);
    const delta = input.newQuantity - (current?.quantity ?? 0);
    await changeStock(
      tx,
      input.partId,
      loc.id,
      delta,
      "ADJUSTMENT",
      undefined,
      input.notes ?? "Stock adjustment",
    );
  });
  return { partId: input.partId, locationCode: input.locationCode, quantity: input.newQuantity };
}

// ─── Transfers ───────────────────────────────────────────────────────
type TransferLine = { partId: string; quantity: number };

/**
 * Move stock between the two locations.
 *
 * Takes a list of lines so a whole pick — several parts, or everything in a
 * category — lands as one transfer in one transaction: either the lot moves
 * or none of it does. The old single-part shape (`partId` + `quantity`) is
 * still accepted; the job sheet and the part page both post it.
 */
export async function transferStock(input: {
  partId?: string;
  quantity?: number;
  items?: TransferLine[];
  fromLocationCode?: "SHOP" | "WAREHOUSE";
  toLocationCode?: "SHOP" | "WAREHOUSE";
  notes?: string;
}) {
  const raw: TransferLine[] = input.items?.length
    ? input.items
    : input.partId
      ? [{ partId: input.partId, quantity: Number(input.quantity ?? 0) }]
      : [];
  if (!raw.length) {
    throw new ApiError(400, "Pick at least one part to move");
  }

  // The same part can be picked twice — once by name, once by the category it
  // sits in. That is one line on the shelf, not two competing ones.
  const merged = new Map<string, number>();
  for (const line of raw) {
    const partId = String(line?.partId ?? "");
    const quantity = Math.floor(Number(line?.quantity));
    if (!partId) throw new ApiError(400, "Every line needs a part");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, "Quantity must be greater than zero");
    }
    merged.set(partId, (merged.get(partId) ?? 0) + quantity);
  }
  const lines = [...merged].map(([partId, quantity]) => ({ partId, quantity }));
  if (lines.length > 200) {
    throw new ApiError(400, "That is too many parts for one move — split it into smaller transfers");
  }

  const fromCode = input.fromLocationCode ?? "WAREHOUSE";
  const toCode = input.toLocationCode ?? "SHOP";
  if (fromCode === toCode) {
    throw new ApiError(400, "Stock has to move between two different locations");
  }
  const from = await getLocationByCode(fromCode);
  const to = await getLocationByCode(toCode);

  // Names up front: they are what tells the user *which* part ran out when a
  // twenty-line move fails, and the lookup doubles as the check that every id
  // is real.
  const named = await db
    .select({ id: parts.id, name: parts.name })
    .from(parts)
    .where(inArray(parts.id, lines.map((l) => l.partId)));
  const nameById = new Map(named.map((r: any) => [r.id, r.name as string]));
  for (const line of lines) {
    if (!nameById.has(line.partId)) throw new ApiError(404, "Part not found", "NOT_FOUND");
  }

  const fromLabel = from.name?.toLowerCase() ?? fromCode.toLowerCase();

  let transferId: string | undefined;
  await db.transaction(async (tx: any) => {
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        fromLocationId: from.id,
        toLocationId: to.id,
        notes: input.notes,
      })
      .returning();

    for (const line of lines) {
      try {
        await changeStock(
          tx, line.partId, from.id, -line.quantity, "TRANSFER_OUT", undefined, input.notes,
        );
      } catch (err) {
        // changeStock can only say "not enough" — it does not know which of
        // the lines it was called for. Name the part, and say plainly that
        // the rollback means nothing at all moved.
        if (err instanceof ApiError && err.code === "INSUFFICIENT_STOCK") {
          throw new ApiError(
            409,
            `Not enough stock: the ${fromLabel} doesn't hold ${line.quantity} × ${nameById.get(line.partId)}. Nothing was moved.`,
            "INSUFFICIENT_STOCK",
          );
        }
        throw err;
      }
      await changeStock(
        tx, line.partId, to.id, line.quantity, "TRANSFER_IN", undefined, input.notes,
      );
    }

    await tx.insert(stockTransferItems).values(
      lines.map((line) => ({
        transferId: transfer.id,
        partId: line.partId,
        quantity: line.quantity,
      })),
    );
    transferId = transfer.id;
  });
  return {
    transferId,
    fromLocationCode: fromCode,
    toLocationCode: toCode,
    lines: lines.length,
    units: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export async function listTransfers() {
  // Part names and both location names travel with the row: a transfer can
  // now carry twenty lines, and the history should not need the whole parts
  // list loaded alongside it to be readable.
  const fromLocation = aliasedTable(inventoryLocations, "from_location");
  const toLocation = aliasedTable(inventoryLocations, "to_location");

  const rows = await db
    .select({
      id: stockTransfers.id,
      notes: stockTransfers.notes,
      createdAt: stockTransfers.createdAt,
      fromCode: fromLocation.code,
      fromName: fromLocation.name,
      toCode: toLocation.code,
      toName: toLocation.name,
      items: sql<string>`coalesce(json_agg(
        json_build_object(
          'id', ${stockTransferItems.id},
          'partId', ${stockTransferItems.partId},
          'name', ${parts.name},
          'unit', ${parts.unit},
          'quantity', ${stockTransferItems.quantity}
        ) order by ${parts.name}
      ) filter (where ${stockTransferItems.id} is not null), '[]'::json)`,
    })
    .from(stockTransfers)
    .innerJoin(fromLocation, eq(stockTransfers.fromLocationId, fromLocation.id))
    .innerJoin(toLocation, eq(stockTransfers.toLocationId, toLocation.id))
    .leftJoin(
      stockTransferItems,
      eq(stockTransferItems.transferId, stockTransfers.id),
    )
    .leftJoin(parts, eq(stockTransferItems.partId, parts.id))
    .groupBy(stockTransfers.id, fromLocation.id, toLocation.id)
    .orderBy(desc(stockTransfers.createdAt))
    .limit(100);
  return rows;
}

/**
 * The most recent stock transfer, or null if there has never been one.
 *
 * Deliberately not scoped to a period. "Last transfer within the selected
 * week" is empty most weeks and answers nothing; "last transfer, three days
 * ago, Warehouse → Shop" is the fact behind the actual question, which is
 * whether anyone has restocked the floor lately.
 */
export async function getLastTransfer() {
  const fromLocation = aliasedTable(inventoryLocations, "from_location");
  const toLocation = aliasedTable(inventoryLocations, "to_location");

  const [row] = await db
    .select({
      id: stockTransfers.id,
      createdAt: stockTransfers.createdAt,
      fromCode: fromLocation.code,
      fromName: fromLocation.name,
      toCode: toLocation.code,
      toName: toLocation.name,
      lines: sql<number>`count(${stockTransferItems.id})::int`,
      units: sql<number>`coalesce(sum(${stockTransferItems.quantity}), 0)::int`,
    })
    .from(stockTransfers)
    .innerJoin(fromLocation, eq(stockTransfers.fromLocationId, fromLocation.id))
    .innerJoin(toLocation, eq(stockTransfers.toLocationId, toLocation.id))
    .leftJoin(stockTransferItems, eq(stockTransferItems.transferId, stockTransfers.id))
    .groupBy(stockTransfers.id, fromLocation.id, toLocation.id)
    .orderBy(desc(stockTransfers.createdAt))
    .limit(1);

  return row ?? null;
}

// ─── Movements ───────────────────────────────────────────────────────
export async function listMovements(opts: {
  partId?: string;
  locationCode?: string;
  limit?: number;
}) {
  const conditions = [];
  if (opts.partId) conditions.push(eq(stockMovements.partId, opts.partId));
  if (opts.locationCode) {
    const loc = await getLocationByCode(opts.locationCode);
    conditions.push(eq(stockMovements.locationId, loc.id));
  }
  const rows = await db
    .select({
      id: stockMovements.id,
      partId: stockMovements.partId,
      partName: parts.name,
      locationCode: inventoryLocations.code,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      referenceType: stockMovements.referenceType,
      referenceId: stockMovements.referenceId,
      notes: stockMovements.notes,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(parts, eq(stockMovements.partId, parts.id))
    .innerJoin(
      inventoryLocations,
      eq(stockMovements.locationId, inventoryLocations.id),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(opts.limit ?? 100);
  return rows;
}

// ─── Stock totals ────────────────────────────────────────────────────
export type StockTotals = {
  shop: { units: number; belowMin: number };
  warehouse: { units: number; belowMin: number };
};

/**
 * Units on hand and parts below minimum, per location.
 *
 * This exists because the parts browser used to sum the rows it had already
 * fetched. `listParts` caps at 500, so past 500 parts that sum silently
 * under-reported — and a stock figure that lies is worse than no figure at
 * all. This counts in the database, over the whole catalogue, and takes the
 * same scope the list is showing so the two always agree about what they are
 * describing.
 *
 * One pass, not four: the per-location balances are pivoted with filtered
 * aggregates rather than joined twice. Archived parts are excluded, matching
 * the stock-value aggregate in report.service.
 */
export async function getStockTotals(opts?: {
  categoryId?: string;
  subCategoryId?: string;
  q?: string;
}): Promise<StockTotals> {
  const conditions = [eq(parts.isArchived, false)];
  if (opts?.categoryId) conditions.push(eq(parts.categoryId, opts.categoryId));
  if (opts?.subCategoryId) conditions.push(eq(parts.subCategoryId, opts.subCategoryId));
  const q = opts?.q?.trim();
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${parts.name}) like ${like} or lower(coalesce(${parts.partNumber},'')) like ${like} or lower(coalesce(${parts.brand},'')) like ${like})`,
    );
  }

  const shopBal = aliasedTable(inventoryBalances, "shop_bal");
  const whBal = aliasedTable(inventoryBalances, "wh_bal");
  const shopLoc = aliasedTable(inventoryLocations, "shop_loc");
  const whLoc = aliasedTable(inventoryLocations, "wh_loc");

  const shopQty = sql<number>`coalesce(${shopBal.quantity}, 0)`;
  const whQty = sql<number>`coalesce(${whBal.quantity}, 0)`;

  const [row] = await db
    .select({
      shopUnits: sql<number>`coalesce(sum(${shopQty}), 0)::int`,
      warehouseUnits: sql<number>`coalesce(sum(${whQty}), 0)::int`,
      shopBelowMin: sql<number>`count(*) filter (where ${shopQty} < ${parts.minimumShopStock})::int`,
      warehouseBelowMin: sql<number>`count(*) filter (where ${whQty} < ${parts.minimumWarehouseStock})::int`,
    })
    .from(parts)
    .leftJoin(shopLoc, sql`${shopLoc.code} = 'SHOP'`)
    .leftJoin(whLoc, sql`${whLoc.code} = 'WAREHOUSE'`)
    .leftJoin(shopBal, and(eq(shopBal.partId, parts.id), eq(shopBal.locationId, shopLoc.id)))
    .leftJoin(whBal, and(eq(whBal.partId, parts.id), eq(whBal.locationId, whLoc.id)))
    .where(and(...conditions));

  return {
    shop: {
      units: Number(row?.shopUnits ?? 0),
      belowMin: Number(row?.shopBelowMin ?? 0),
    },
    warehouse: {
      units: Number(row?.warehouseUnits ?? 0),
      belowMin: Number(row?.warehouseBelowMin ?? 0),
    },
  };
}

// ─── Low stock ───────────────────────────────────────────────────────
/**
 * Every part under a minimum, at either location.
 *
 * `opts` exists for the dashboard, which is the one caller that already holds
 * both location rows and does not show the usage figure. Passing them in turns
 * four round trips into one — the two `getLocationByCode` lookups here are
 * uncached and run in sequence, and `recentUsage` is a whole extra query for a
 * column the dashboard never renders.
 *
 * The dashboard used to run its own shop-only copy of this query instead,
 * which is why its "Low shop stock" tile, the nav badge and /inventory/low-stock
 * could each report a different number for the same question.
 */
export async function getLowStock(opts?: {
  locations?: { shopId: string; warehouseId: string };
  withUsage?: boolean;
}) {
  const shop = opts?.locations
    ? { id: opts.locations.shopId }
    : await getLocationByCode("SHOP");
  const warehouse = opts?.locations
    ? { id: opts.locations.warehouseId }
    : await getLocationByCode("WAREHOUSE");

  // A part counts as low when EITHER location is under its own minimum.
  //
  // This used to join the shop only and compare against minimumShopStock, so a
  // part with a healthy shop float and a depleted warehouse was reported
  // "Running low" on its own page — which checks both — yet never appeared in
  // this list or its badge. minimumWarehouseStock exists precisely to warn
  // about the back room; ignoring it made the setting do nothing.
  const shopBal = aliasedTable(inventoryBalances, "shop_bal");
  const whBal = aliasedTable(inventoryBalances, "wh_bal");

  const rows = await db
    .select({
      partId: parts.id,
      name: parts.name,
      partNumber: parts.partNumber,
      brand: parts.brand,
      unit: parts.unit,
      minimumShopStock: parts.minimumShopStock,
      minimumWarehouseStock: parts.minimumWarehouseStock,
      sellingPrice: parts.sellingPrice,
      shopStock: sql<number>`coalesce(${shopBal.quantity}, 0)`,
      warehouseStock: sql<number>`coalesce(${whBal.quantity}, 0)`,
    })
    .from(parts)
    .leftJoin(shopBal, and(eq(shopBal.partId, parts.id), eq(shopBal.locationId, shop.id)))
    .leftJoin(whBal, and(eq(whBal.partId, parts.id), eq(whBal.locationId, warehouse.id)))
    .where(
      and(
        eq(parts.isArchived, false),
        sql`(
          coalesce(${shopBal.quantity}, 0) < ${parts.minimumShopStock}
          or coalesce(${whBal.quantity}, 0) < ${parts.minimumWarehouseStock}
        )`,
      ),
    )
    // Emptiest shop floor first — that is what stops a job today.
    .orderBy(sql`coalesce(${shopBal.quantity}, 0)`);

  const usage =
    opts?.withUsage === false
      ? new Map<string, number>()
      : await recentUsage(rows.map((r: any) => r.partId));

  return rows.map((r: any) => {
    const shopStock = Number(r.shopStock);
    const warehouseStock = Number(r.warehouseStock);
    return {
      ...r,
      // The dashboard keys and links its rows by `id`; this query names the
      // column `partId`. Aliased here rather than at the call site so the
      // payload the dashboard has always received is unchanged.
      id: r.partId,
      shopStock,
      warehouseStock,
      // Which location is actually short, so the UI can say why a part is here
      // instead of leaving the reader to compare four numbers themselves.
      shopShort: shopStock < r.minimumShopStock,
      warehouseShort: warehouseStock < r.minimumWarehouseStock,
      // Units consumed over the last 30 days. "3 left" is a number; "3 left,
      // and you got through 14 last month" is a decision.
      usedLast30Days: usage.get(r.partId) ?? 0,
    };
  });
}

/** Days of history behind the usage figure shown beside a low-stock part. */
export const USAGE_WINDOW_DAYS = 30;

/**
 * Units of each part consumed by completed jobs over the last 30 days.
 *
 * The window is deliberately long. A workshop's consumption is lumpy — five
 * brake pads on one busy Monday and none for a week — so a per-day rate taken
 * over a day or two is noise, and a "runs out in 2 days" forecast built on it
 * would be wrong often enough that the owner stops reading the panel. Thirty
 * days is enough to be a fact about the month rather than a guess about
 * tomorrow, which is why the UI states it as history and lets the reader draw
 * the conclusion.
 */
async function recentUsage(partIds: string[]) {
  if (!partIds.length) return new Map<string, number>();

  const since = new Date();
  since.setDate(since.getDate() - USAGE_WINDOW_DAYS);

  const rows = await db
    .select({
      partId: stockMovements.partId,
      used: sql<number>`coalesce(sum(${stockMovements.quantity} * -1), 0)::int`,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.movementType, "JOB_USAGE"),
        gte(stockMovements.createdAt, since),
        inArray(stockMovements.partId, partIds),
      ),
    )
    .groupBy(stockMovements.partId);

  return new Map<string, number>(rows.map((r: any) => [r.partId, Number(r.used ?? 0)]));
}
