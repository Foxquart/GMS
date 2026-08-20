import { NextRequest } from "next/server";
import { handleError } from "@/server/lib/http";
import { verifyShareToken } from "@/server/lib/share-token";
import { buildInvoicePdf } from "@/server/services/pdf.service";
import { getInvoice } from "@/server/services/invoice.service";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await ctx.params;
    const payload = await verifyShareToken(token);
    if (!payload) {
      return new Response("Invalid or expired link", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const data = await getInvoice(payload.invoiceId);
    if (!data || !data.invoice) {
      return new Response("Invoice not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (data.invoice.status === "CANCELLED") {
      return new Response("This invoice has been cancelled", {
        status: 410,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const pdf = await buildInvoicePdf(data.invoice.id);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${data.invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}