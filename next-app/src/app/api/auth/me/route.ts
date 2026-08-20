import { getSession } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    return ok(session);
  } catch (err) {
    return handleError(err);
  }
}