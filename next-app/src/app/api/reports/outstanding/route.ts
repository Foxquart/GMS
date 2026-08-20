import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getCustomerOutstanding } from "@/server/services/report.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await getCustomerOutstanding());
  } catch (err) {
    return handleError(err);
  }
}