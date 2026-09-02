import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getCustomerOutstanding } from "@/server/services/report.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    // The dashboard asks for the top few under a "Customers →" link; the
    // customers page asks for everyone. Parsed the same way as the limit on
    // /api/reports/parts-usage.
    const limitParam = Number(request.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
    return ok(await getCustomerOutstanding({ limit }));
  } catch (err) {
    return handleError(err);
  }
}
