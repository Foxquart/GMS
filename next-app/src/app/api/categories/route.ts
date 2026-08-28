import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import {
  listCategories,
  createCategory,
  updateCategory,
} from "@/server/services/category.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    const includeArchived = sp.get("archived") === "1";
    const q = sp.get("q") ?? undefined;
    return ok(await listCategories({ q: q || undefined, includeArchived }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) throw new ApiError(400, "Category name is required");
    return ok(await createCategory({ name, description: body?.description || undefined }), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

// Backwards-compatible body-with-id update. Prefer PATCH /api/categories/[id].
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (!body?.id) throw new ApiError(400, "Category id is required");
    return ok(
      await updateCategory(String(body.id), {
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
        isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}
