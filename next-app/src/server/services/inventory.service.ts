import { and, desc, eq, sql } from "drizzle-orm";
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
  if (!loc) throw new ApiError(500, `Location ${code} not found`);
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
export async function listCategories(includeArchived = false) {
  return db
    .select()
    .from(categories)
    .where(includeArchived ? undefined : eq(categories.isArchived, false))
    .orderBy(categories.name);
}

export async function createCategory(input: { name: string; description?: string }) {
  const [row] = await db.insert(categories).values(input).returning();
  return row;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string; isArchived?: boolean },
) {
  const [row] = await db
    .update(categories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Category not found");
  return row;
}

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
  if (!row) throw new ApiError(404, "Supplier not found");
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
}) {
  const [row] = await db.insert(parts).values(input).returning();
  return row;
}

export async function updatePart(id: string, input: Record<string, unknown>) {
  const [row] = await db
    .update(parts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(parts.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Part not found");
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
  if (!part) throw new ApiError(404, "Part not found");

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
  if (!part) throw new ApiError(404, "Part not found");

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
      shopStock: sql<number>`coalesce(${inventoryBalances.quantity}, 0)`,
    })
    .from(parts)
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.partId, parts.id),
        eq(inventoryBalances.locationId, shop.id),
      ),
    )
    .where(
      and(
        eq(parts.isArchived, false),
        sql`coalesce(${inventoryBalances.quantity}, 0) < ${parts.minimumShopStock}`,
      ),
    )
    .orderBy(sql`coalesce(${inventoryBalances.quantity}, 0)`);

  const warehouseBalances = await db
    .select({
      partId: inventoryBalances.partId,
      quantity: inventoryBalances.quantity,
    })
    .from(inventoryBalances)
    .where(eq(inventoryBalances.locationId, warehouse.id));

  const whMap = new Map(warehouseBalances.map((b: any) => [b.partId, b.quantity]));

  return rows.map((r: any) => ({
    ...r,
    shopStock: Number(r.shopStock),
    warehouseStock: whMap.get(r.partId) ?? 0,
  }));
}