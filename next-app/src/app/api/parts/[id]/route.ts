import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getPart, getPartBalances } from "@/server/services/inventory.service";
import { getPartUsage } from "@/server/services/report.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const part = await getPart(id);
    if (!part) return ok(null);
    // Balances say what is on the shelf; usage says how fast it leaves. They
    // share no state, so they go out together.
    const [balances, usage] = await Promise.all([getPartBalances(id), getPartUsage(id)]);
    return ok({ ...part, balances, usage });
  } catch (err) {
    return handleError(err);
  }
}