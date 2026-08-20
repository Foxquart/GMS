import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import { getSettings, updateSettings } from "@/server/services/settings.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await getSettings());
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    return ok(
      await updateSettings({
        businessName: body?.businessName !== undefined ? String(body.businessName) : undefined,
        businessPhone: body?.businessPhone !== undefined ? String(body.businessPhone) : undefined,
        businessAddress: body?.businessAddress !== undefined ? String(body.businessAddress) : undefined,
        invoicePrefix: body?.invoicePrefix !== undefined ? String(body.invoicePrefix) : undefined,
        invoiceTerms: body?.invoiceTerms !== undefined ? String(body.invoiceTerms) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}