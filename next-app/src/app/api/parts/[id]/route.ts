import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getPart, getPartBalances } from "@/server/services/inventory.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const part = await getPart(id);
    if (!part) return ok(null);
    const balances = await getPartBalances(id);
    return ok({ ...part, balances });
  } catch (err) {
    return handleError(err);
  }
}