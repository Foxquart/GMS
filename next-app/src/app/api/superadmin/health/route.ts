import { NextResponse } from "next/server";
import {
  API_LATENCY_THRESHOLD_MS,
  getSuperadminOverview,
  pingDatabase,
  recordHealthCheck,
} from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";

export async function GET() {
  const handlerStartedAt = Date.now();
  try {
    await requireSuperadmin();

    // The probe has to be alone — it is the measurement, and anything sharing
    // its round trip would be timed into it. Everything after is independent,
    // so it goes out in one wave rather than one round trip at a time.
    const database = await pingDatabase();
    const [overview] = await Promise.all([
      getSuperadminOverview(database),
      recordHealthCheck(database),
    ]);

    // Measured, not assumed: the wall time this handler actually spent
    // producing the response, of which the database probe is one slice.
    const latencyMs = Date.now() - handlerStartedAt;
    const api = {
      status: latencyMs > API_LATENCY_THRESHOLD_MS ? "DEGRADED" : "HEALTHY",
      latencyMs,
      thresholdMs: API_LATENCY_THRESHOLD_MS,
      details:
        `Handler completed in ${latencyMs}ms, ` +
        `${database.latencyMs}ms of it waiting on the database`,
    };

    return NextResponse.json({ database, api, timestamp: new Date().toISOString(), overview });
  } catch (err: any) {
    // ApiError carries `status`; reading only `statusCode` turned every 401
    // and 403 into a 500.
    const status = err?.status || err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
