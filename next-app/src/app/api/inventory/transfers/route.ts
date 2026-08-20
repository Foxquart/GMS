import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { transferStock, listTransfers } from "@/server/services/inventory.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await listTransfers());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const partId = String(body?.partId ?? "");
    const quantity = Number(body?.quantity ?? 0);
    if (!partId || quantity <= 0) {
      throw new ApiError(400, "Part and a positive quantity are required");
    }
    return ok(await transferStock({ partId, quantity, notes: body?.notes || undefined }), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}