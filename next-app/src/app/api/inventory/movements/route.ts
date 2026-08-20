import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { listMovements } from "@/server/services/inventory.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await listMovements({
        partId: sp.get("partId") ?? undefined,
        locationCode: sp.get("locationCode") ?? undefined,
        limit: Number(sp.get("limit") ?? 100),
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}