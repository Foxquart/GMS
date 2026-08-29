import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getPartsUsage, type ReportPeriod } from "@/server/services/report.service";

const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    const requested = sp.get("period") ?? "daily";
    const period = (PERIODS as readonly string[]).includes(requested)
      ? (requested as ReportPeriod)
      : "daily";
    // The dashboard asks for a handful; the report page asks for everything.
    // Totals are computed before the trim either way.
    const limitParam = Number(sp.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
    return ok(await getPartsUsage(period, { limit }));
  } catch (err) {
    return handleError(err);
  }
}
