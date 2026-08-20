import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { listInvoices } from "@/server/services/invoice.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await listInvoices({
        status: sp.get("status") ?? undefined,
        q: sp.get("q") ?? undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}