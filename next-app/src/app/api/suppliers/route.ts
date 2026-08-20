import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
} from "@/server/services/inventory.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await listSuppliers());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) throw new ApiError(400, "Supplier name is required");
    return ok(
      await createSupplier({
        name,
        phone: body?.phone || undefined,
        address: body?.address || undefined,
        notes: body?.notes || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (!body?.id) throw new ApiError(400, "Supplier id is required");
    return ok(
      await updateSupplier(String(body.id), {
        name: body.name !== undefined ? String(body.name) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        address: body.address !== undefined ? String(body.address) : undefined,
        notes: body.notes !== undefined ? String(body.notes) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}