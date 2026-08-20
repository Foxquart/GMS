import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { createShareToken } from "@/server/lib/share-token";
import { getInvoice } from "@/server/services/invoice.service";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const data = await getInvoice(id);
    if (data.invoice.status === "CANCELLED") {
      return ok({ url: null });
    }
    const token = await createShareToken(id);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return ok({ url: `${origin}/api/share/${token}/pdf` });
  } catch (err) {
    return handleError(err);
  }
}