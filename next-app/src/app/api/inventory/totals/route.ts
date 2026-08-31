import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getStockTotals } from "@/server/services/inventory.service";

/**
 * Units on hand and parts below minimum, per location, over the whole
 * catalogue — not just the page of parts currently on screen. Takes the same
 * scope as the list so the two always describe the same set.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await getStockTotals({
        categoryId: sp.get("categoryId") ?? undefined,
        subCategoryId: sp.get("subCategoryId") ?? undefined,
        q: sp.get("q") ?? undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}
