import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { listCustomers, createCustomer } from "@/server/services/customer.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const q = request.nextUrl.searchParams.get("q") ?? "";
    return ok(await listCustomers({ q }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    // Phone is optional: a cash walk-in is a real customer. The name is the
    // only thing a record is useless without.
    if (!name) {
      throw new ApiError(400, "Name is required");
    }
    const customer = await createCustomer({
      name,
      phone: phone || null,
      address: body?.address || undefined,
      notes: body?.notes || undefined,
    });
    return ok(customer, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}