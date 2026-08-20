import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { stockIn } from "@/server/services/inventory.service";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const partId = String(body?.partId ?? "");
    const quantity = Number(body?.quantity ?? 0);
    const locationCode = String(body?.locationCode ?? "SHOP");
    if (!partId || quantity <= 0) {
      throw new ApiError(400, "Part and a positive quantity are required");
    }
    if (!["SHOP", "WAREHOUSE"].includes(locationCode)) {
      throw new ApiError(400, "Invalid location");
    }
    return ok(
      await stockIn({
        partId,
        quantity,
        locationCode: locationCode as "SHOP" | "WAREHOUSE",
        supplierId: body?.supplierId ? String(body.supplierId) : undefined,
        notes: body?.notes || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}