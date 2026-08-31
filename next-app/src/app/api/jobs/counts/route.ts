import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getJobStatusCounts } from "@/server/services/job.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    return ok(await getJobStatusCounts({ q: q || undefined }));
  } catch (err) {
    return handleError(err);
  }
}
