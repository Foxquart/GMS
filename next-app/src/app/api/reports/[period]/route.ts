import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getReport } from "@/server/services/report.service";

const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ period: string }> }) {
  try {
    await requireAuth();
    const { period } = await ctx.params;
    if (!PERIODS.includes(period as (typeof PERIODS)[number])) {
      return ok(null);
    }
    return ok(await getReport(period as (typeof PERIODS)[number]));
  } catch (err) {
    return handleError(err);
  }
}