import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { createVehicle, listVehicles } from "@/server/services/customer.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;
    return ok(await listVehicles(customerId));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (!body?.customerId) throw new ApiError(400, "Customer is required");
    if (!body?.vehicleType) throw new ApiError(400, "Vehicle type is required");
    return ok(
      await createVehicle({
        customerId: String(body.customerId),
        vehicleType: String(body.vehicleType),
        vehicleName: body.vehicleName || undefined,
        registrationNumber: body.registrationNumber || undefined,
        notes: body.notes || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}