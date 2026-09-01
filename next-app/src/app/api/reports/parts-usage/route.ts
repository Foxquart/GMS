import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { getPartsUsage } from "@/server/services/report.service";
import { parseRange } from "@/lib/date-range";

/** `GET /api/reports/parts-usage?from=&to=&limit=` — same window contract as /api/reports. */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    const range = parseRange(sp.get("from") ?? "", sp.get("to") ?? "");
    if (!range) {
      throw new ApiError(400, "Give a from and to date, as YYYY-MM-DD", "BAD_RANGE");
    }
    // The dashboard asks for a handful; the report page asks for everything.
    // Totals are computed before the trim either way.
    const limitParam = Number(sp.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
    return ok(await getPartsUsage(range, { limit }));
  } catch (err) {
    return handleError(err);
  }
}
