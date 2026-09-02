import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import {
  listParts,
  createPart,
  updatePart,
  getPart,
  type PartSort,
  type PartStockFilter,
  type StockLocationCode,
} from "@/server/services/inventory.service";
import { assertSubCategoryInCategory } from "@/server/services/subcategory.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page"));
    const pageSize = Number(sp.get("pageSize"));
    return ok(
      await listParts({
        q: sp.get("q") ?? undefined,
        categoryId: sp.get("categoryId") ?? undefined,
        subCategoryId: sp.get("subCategoryId") ?? undefined,
        includeArchived: sp.get("archived") === "1",
        sort: (sp.get("sort") as PartSort) ?? undefined,
        location: (sp.get("location") as StockLocationCode) ?? undefined,
        stock: (sp.get("stock") as PartStockFilter) ?? undefined,
        page: Number.isFinite(page) && page > 0 ? page : undefined,
        pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) throw new ApiError(400, "Part name is required");

    const categoryId = body?.categoryId || undefined;
    const subCategoryId = body?.subCategoryId || undefined;
    // A sub-category is always read inside a category, so the two columns are
    // never allowed to disagree about where the part sits.
    if (subCategoryId) await assertSubCategoryInCategory(String(subCategoryId), categoryId);

    return ok(
      await createPart({
        name,
        categoryId,
        subCategoryId,
        supplierId: body?.supplierId || undefined,
        partNumber: body?.partNumber || undefined,
        brand: body?.brand || undefined,
        purchasePrice: body?.purchasePrice !== undefined ? String(body.purchasePrice) : undefined,
        sellingPrice: body?.sellingPrice !== undefined ? String(body.sellingPrice) : undefined,
        minimumShopStock: body?.minimumShopStock !== undefined ? Number(body.minimumShopStock) : undefined,
        minimumWarehouseStock: body?.minimumWarehouseStock !== undefined ? Number(body.minimumWarehouseStock) : undefined,
        attributes: Array.isArray(body?.attributes) ? body.attributes : undefined,
        openingShopStock: body?.openingShopStock !== undefined ? Number(body.openingShopStock) : undefined,
        openingWarehouseStock:
          body?.openingWarehouseStock !== undefined ? Number(body.openingWarehouseStock) : undefined,
        unit: body?.unit || undefined,
        barcode: body?.barcode || undefined,
        description: body?.description || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (!body?.id) throw new ApiError(400, "Part id is required");
    const updates: Record<string, unknown> = {};
    for (const key of [
      "name",
      "categoryId",
      "subCategoryId",
      "supplierId",
      "partNumber",
      "brand",
      "barcode",
      "unit",
      "description",
      "isArchived",
      "attributes",
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    for (const key of ["purchasePrice", "sellingPrice"]) {
      if (body[key] !== undefined) updates[key] = String(body[key]);
    }
    for (const key of ["minimumShopStock", "minimumWarehouseStock"]) {
      if (body[key] !== undefined) updates[key] = Number(body[key]);
    }

    // Blank means "clear it"; anything else has to be checked against the
    // category the part will end up in, which may itself be part of this patch.
    if (updates.subCategoryId !== undefined) {
      const subCategoryId = updates.subCategoryId ? String(updates.subCategoryId) : null;
      updates.subCategoryId = subCategoryId;
      if (subCategoryId) {
        const categoryId =
          updates.categoryId !== undefined
            ? (updates.categoryId as string | null)
            : ((await getPart(String(body.id)))?.categoryId ?? null);
        await assertSubCategoryInCategory(subCategoryId, categoryId);
      }
    }
    // Moving a part to a different category strands whatever sub-category it
    // had, so it is dropped rather than left pointing somewhere it is not filed.
    if (updates.categoryId !== undefined && updates.subCategoryId === undefined) {
      const current = await getPart(String(body.id));
      if (current?.subCategoryId && current.categoryId !== (updates.categoryId || null)) {
        updates.subCategoryId = null;
      }
    }

    return ok(await updatePart(String(body.id), updates));
  } catch (err) {
    return handleError(err);
  }
}