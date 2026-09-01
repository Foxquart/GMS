import { requireSuperadmin } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getStorageSnapshot } from "@/server/services/storage.service";

export async function GET(request: Request) {
  try {
    await requireSuperadmin();
    // `?refresh=1` is the console's manual refresh button. Without it the
    // cached snapshot is served, so a page reload does not wake a sleeping
    // database to re-measure something that moves this slowly.
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    return ok(await getStorageSnapshot({ force }));
  } catch (err) {
    return handleError(err);
  }
}
