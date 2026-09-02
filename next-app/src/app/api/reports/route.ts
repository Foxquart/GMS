import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { getReport } from "@/server/services/report.service";
import { parseRange } from "@/lib/date-range";

/**
 * `GET /api/reports?from=2026-08-01&to=2026-08-31`
 *
 * Replaces `/api/reports/[period]`, whose path parameter was a whitelist of
 * four fixed windows — the thing that made "10–20 August" unaskable.
 *
 * The client resolves its own presets and always sends plain calendar dates;
 * the server turns them into local-zone day boundaries, the same convention
 * the old `periodStart` used. One workshop in one timezone, stated here
 * rather than left implicit.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    const range = parseRange(sp.get("from") ?? "", sp.get("to") ?? "");
    // A bad range is refused rather than quietly defaulted: silently reporting
    // on a window nobody asked for is how a wrong figure gets believed.
    if (!range) {
      throw new ApiError(400, "Give a from and to date, as YYYY-MM-DD", "BAD_RANGE");
    }
    return ok(await getReport(range));
  } catch (err) {
    return handleError(err);
  }
}
