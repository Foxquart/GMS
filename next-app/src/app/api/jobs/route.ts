import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { createJob, listJobs } from "@/server/services/job.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await listJobs({
        status: sp.get("status") ?? undefined,
        q: sp.get("q") ?? undefined,
        limit: Number(sp.get("limit") ?? 100),
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (!body?.customerId) {
      throw new ApiError(400, "Customer is required");
    }
    const job = await createJob({
      customerId: String(body.customerId),
      vehicleId: body.vehicleId ? String(body.vehicleId) : undefined,
      vehicleType: body.vehicleType || undefined,
      vehicleName: body.vehicleName || undefined,
      registrationNumber: body.registrationNumber || undefined,
      complaint: body.complaint || undefined,
      workNotes: body.workNotes || undefined,
      odometerReading: body.odometerReading || undefined,
      status: body.status || undefined,
    });
    return ok(job, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}