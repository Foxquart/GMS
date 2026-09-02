import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { listSubCategories, createSubCategory } from "@/server/services/subcategory.service";

/**
 * `?categoryId=` is the call the inventory page makes when a category tile is
 * opened. Without it this lists every sub-category in the workshop, which is
 * what the "link to more categories" picker needs.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;
    return ok(
      await listSubCategories({
        categoryId: sp.get("categoryId") || undefined,
        q: sp.get("q") || undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) throw new ApiError(400, "Sub-category name is required");

    // Accepts either the array or a lone `categoryId`, so the "new
    // sub-category inside this category" path does not have to build a list.
    const categoryIds: string[] = Array.isArray(body?.categoryIds)
      ? body.categoryIds.map(String)
      : body?.categoryId
        ? [String(body.categoryId)]
        : [];

    return ok(
      await createSubCategory({
        name,
        description: body?.description || undefined,
        categoryIds,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
