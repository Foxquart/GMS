import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getLowStock } from "@/server/services/inventory.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await getLowStock());
  } catch (err) {
    return handleError(err);
  }
}