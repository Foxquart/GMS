import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { adjustStock } from "@/server/services/inventory.service";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const partId = String(body?.partId ?? "");
    const newQuantity = Number(body?.newQuantity ?? -1);
    const locationCode = String(body?.locationCode ?? "SHOP");
    if (!partId || newQuantity < 0) {
      throw new ApiError(400, "Part and a non-negative quantity are required");
    }
    if (!["SHOP", "WAREHOUSE"].includes(locationCode)) {
      throw new ApiError(400, "Invalid location");
    }
    return ok(
      await adjustStock({
        partId,
        locationCode: locationCode as "SHOP" | "WAREHOUSE",
        newQuantity,
        notes: body?.notes || undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}