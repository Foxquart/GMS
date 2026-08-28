import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import {
  listParts,
  createPart,
  updatePart,
} from "@/server/services/inventory.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await listParts({
        q: sp.get("q") ?? undefined,
        categoryId: sp.get("categoryId") ?? undefined,
        includeArchived: sp.get("archived") === "1",
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
    return ok(
      await createPart({
        name,
        categoryId: body?.categoryId || undefined,
        supplierId: body?.supplierId || undefined,
        partNumber: body?.partNumber || undefined,
        brand: body?.brand || undefined,
        purchasePrice: body?.purchasePrice !== undefined ? String(body.purchasePrice) : undefined,
        sellingPrice: body?.sellingPrice !== undefined ? String(body.sellingPrice) : undefined,
        minimumShopStock: body?.minimumShopStock !== undefined ? Number(body.minimumShopStock) : undefined,
        minimumWarehouseStock: body?.minimumWarehouseStock !== undefined ? Number(body.minimumWarehouseStock) : undefined,
        attributes: Array.isArray(body?.attributes) ? body.attributes : undefined,
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
    return ok(await updatePart(String(body.id), updates));
  } catch (err) {
    return handleError(err);
  }
}