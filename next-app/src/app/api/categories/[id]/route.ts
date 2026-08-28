import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import {
  getCategory,
  updateCategory,
  deleteCategory,
} from "@/server/services/category.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    return ok(await getCategory(id));
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
      await updateCategory(id, {
        name: body?.name !== undefined ? String(body.name) : undefined,
        description: body?.description !== undefined ? String(body.description) : undefined,
        isArchived: body?.isArchived !== undefined ? Boolean(body.isArchived) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) throw new ApiError(400, "Category name is required");
    return ok(
      await updateCategory(id, {
        name,
        description: body?.description !== undefined ? String(body.description) : "",
        isArchived: Boolean(body?.isArchived ?? false),
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
    return ok(await deleteCategory(id, { force }));
  } catch (err) {
    return handleError(err);
  }
}
