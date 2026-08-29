import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import {
  categories,
  inventoryBalances,
  inventoryLocations,
  parts,
  stockMovements,
  stockTransferItems,
  stockTransfers,
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
export async function listParts(opts: {
  q?: string;
  categoryId?: string;
  includeArchived?: boolean;
  limit?: number;
}) {
  const conditions = [];
  if (!opts.includeArchived) {
    conditions.push(eq(parts.isArchived, false));
  }
  if (opts.categoryId) {
    conditions.push(eq(parts.categoryId, opts.categoryId));
  }
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${parts.name}) like ${like} or lower(coalesce(${parts.partNumber},'')) like ${like} or lower(coalesce(${parts.brand},'')) like ${like})`,
    );
  }

  const rows = await db
    .select({
      id: parts.id,
      name: parts.name,
      partNumber: parts.partNumber,
      brand: parts.brand,
      categoryId: parts.categoryId,
      categoryName: categories.name,
      sellingPrice: parts.sellingPrice,
      purchasePrice: parts.purchasePrice,
      minimumShopStock: parts.minimumShopStock,
      minimumWarehouseStock: parts.minimumWarehouseStock,
      unit: parts.unit,
      isArchived: parts.isArchived,
      shopStock: sql<number>`coalesce((select quantity from ${inventoryBalances} b
        inner join ${inventoryLocations} l on l.id = b.location_id
        where b.part_id = ${parts.id} and l.code = 'SHOP'), 0)`,
      warehouseStock: sql<number>`coalesce((select quantity from ${inventoryBalances} b
        inner join ${inventoryLocations} l on l.id = b.location_id
        where b.part_id = ${parts.id} and l.code = 'WAREHOUSE'), 0)`,
    })
    .from(parts)
    .leftJoin(categories, eq(parts.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(parts.name)
    .limit(opts.limit ?? 500);

  return rows;
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
export async function transferStock(input: {
  partId: string;
  quantity: number;
  notes?: string;
}) {
  if (input.quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than zero");
  }
  const shop = await getLocationByCode("SHOP");
  const warehouse = await getLocationByCode("WAREHOUSE");

  let transferId: string | undefined;
  await db.transaction(async (tx: any) => {
    await changeStock(
      tx,
      input.partId,
      warehouse.id,
      -input.quantity,
      "TRANSFER_OUT",
      undefined,
      input.notes,
    );
    await changeStock(
      tx,
      input.partId,
      shop.id,
      input.quantity,
      "TRANSFER_IN",
      undefined,
      input.notes,
    );
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        fromLocationId: warehouse.id,
        toLocationId: shop.id,
        notes: input.notes,
      })
      .returning();
    await tx.insert(stockTransferItems).values({
      transferId: transfer.id,
      partId: input.partId,
      quantity: input.quantity,
    });
    transferId = transfer.id;
  });
  return { transferId };
}

export async function listTransfers() {
  const rows = await db
    .select({
      id: stockTransfers.id,
      notes: stockTransfers.notes,
      createdAt: stockTransfers.createdAt,
      items: sql<string>`coalesce(json_agg(
        json_build_object(
          'id', ${stockTransferItems.id},
          'partId', ${stockTransferItems.partId},
          'quantity', ${stockTransferItems.quantity}
        )
      ) filter (where ${stockTransferItems.id} is not null), '[]'::json)`,
    })
    .from(stockTransfers)
    .leftJoin(
      stockTransferItems,
      eq(stockTransferItems.transferId, stockTransfers.id),
    )
    .groupBy(stockTransfers.id)
    .orderBy(desc(stockTransfers.createdAt))
    .limit(100);
  return rows;
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

// ─── Low stock ───────────────────────────────────────────────────────
export async function getLowStock() {
  const shop = await getLocationByCode("SHOP");
  const warehouse = await getLocationByCode("WAREHOUSE");

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

  return rows.map((r: any) => {
    const shopStock = Number(r.shopStock);
    const warehouseStock = Number(r.warehouseStock);
    return {
      ...r,
      shopStock,
      warehouseStock,
      // Which location is actually short, so the UI can say why a part is here
      // instead of leaving the reader to compare four numbers themselves.
      shopShort: shopStock < r.minimumShopStock,
      warehouseShort: warehouseStock < r.minimumWarehouseStock,
    };
  });
}
