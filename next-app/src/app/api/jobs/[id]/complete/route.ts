import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { completeJob } from "@/server/services/invoice.service";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();
    const result = await completeJob({
      jobId: id,
      discount: body?.discount !== undefined ? Number(body.discount) : 0,
      notes: body?.notes || undefined,
      payment: body?.payment
        ? {
            amount: Number(body.payment.amount ?? 0),
            method: body.payment.method ?? "CASH",
            notes: body.payment.notes || undefined,
          }
        : null,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}