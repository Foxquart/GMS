import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError } from "@/server/lib/http";
import { buildInvoicePdf } from "@/server/services/pdf.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const pdf = await buildInvoicePdf(id);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}