import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getInvoice } from "@/server/services/invoice.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    return ok(await getInvoice(id));
  } catch (err) {
    return handleError(err);
  }
}