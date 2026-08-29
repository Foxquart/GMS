import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { transferStock, listTransfers } from "@/server/services/inventory.service";

export async function GET() {
  try {
    await requireAuth();
    return ok(await listTransfers());
  } catch (err) {
    return handleError(err);
  }
}

const LOCATIONS = ["SHOP", "WAREHOUSE"] as const;
type LocationCode = (typeof LOCATIONS)[number];

function locationCode(value: unknown, fallback: LocationCode): LocationCode {
  if (value === undefined || value === null || value === "") return fallback;
  const code = String(value).toUpperCase();
  if (!(LOCATIONS as readonly string[]).includes(code)) {
    throw new ApiError(400, "Stock can only be moved between the shop floor and the warehouse");
  }
  return code as LocationCode;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Two accepted shapes: a basket of lines from the move screen, and the
    // single part/quantity the job sheet and part page still post.
    const items = Array.isArray(body?.items)
      ? body.items.map((it: any) => ({
          partId: String(it?.partId ?? ""),
          quantity: Number(it?.quantity ?? 0),
        }))
      : undefined;
    const partId = String(body?.partId ?? "");
    const quantity = Number(body?.quantity ?? 0);

    if (!items?.length && (!partId || quantity <= 0)) {
      throw new ApiError(400, "Part and a positive quantity are required");
    }

    return ok(
      await transferStock({
        items,
        partId: partId || undefined,
        quantity,
        fromLocationCode: locationCode(body?.fromLocationCode, "WAREHOUSE"),
        toLocationCode: locationCode(body?.toLocationCode, "SHOP"),
        notes: body?.notes || undefined,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
