import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { listParts } from "@/server/services/inventory.service";

export async function GET() {
  try {
    await requireAuth();
    const parts = await listParts({});
    return ok(parts);
  } catch (err) {
    return handleError(err);
  }
}