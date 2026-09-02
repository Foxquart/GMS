import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok } from "@/server/lib/http";
import {
  getSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "@/server/services/subcategory.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    return ok(await getSubCategory(id));
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();
    return ok(
      await updateSubCategory(id, {
        name: body?.name !== undefined ? String(body.name) : undefined,
        description: body?.description !== undefined ? String(body.description) : undefined,
        // Absent means "leave the mapping alone"; present means "this is now
        // the whole mapping", and the service rejects an empty one.
        categoryIds: Array.isArray(body?.categoryIds) ? body.categoryIds.map(String) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const force = request.nextUrl.searchParams.get("force") === "1";
    return ok(await deleteSubCategory(id, { force }));
  } catch (err) {
    return handleError(err);
  }
}
