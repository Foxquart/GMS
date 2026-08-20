import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { recordPayment } from "@/server/services/invoice.service";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();
    const amount = Number(body?.amount ?? 0);
    if (amount <= 0) throw new ApiError(400, "A positive payment amount is required");
    const method = String(body?.method ?? "CASH");
    if (!["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"].includes(method)) {
      throw new ApiError(400, "Invalid payment method");
    }
    return ok(
      await recordPayment({
        invoiceId: id,
        amount,
        method,
        notes: body?.notes || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}