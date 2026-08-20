import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { updateCustomer, getCustomerDetail } from "@/server/services/customer.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    return ok(await getCustomerDetail(id));
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();
    return ok(
      await updateCustomer(id, {
        name: body?.name !== undefined ? String(body.name) : undefined,
        phone: body?.phone !== undefined ? String(body.phone) : undefined,
        address: body?.address !== undefined ? String(body.address ?? "") : undefined,
        notes: body?.notes !== undefined ? String(body.notes ?? "") : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}