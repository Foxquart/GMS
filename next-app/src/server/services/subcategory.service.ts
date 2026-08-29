import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { categories, categorySubCategories, parts, subCategories } from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";

export type SubCategoryLink = { id: string; name: string };

export type SubCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  partsCount: number;
  categories: SubCategoryLink[];
};

/**
 * The categories one sub-category is filed under, as a JSON array so the whole
 * list comes back in a single round trip instead of one query per row.
 *
 * The outer reference is spelled out as "sub_categories"."id" for the same
 * reason `partsCountSql` does it in category.service: with no join on the
 * outer query drizzle renders ${subCategories.id} as a bare "id", which
 * Postgres then resolves against the subquery's own tables.
 */
const linkedCategoriesSql = sql<SubCategoryLink[]>`(
  select coalesce(
    json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name),
    '[]'::json
  )
  from ${categorySubCategories} csc
  inner join ${categories} c on c.id = csc.category_id
  where csc.sub_category_id = "sub_categories"."id"
)`;

/**
 * Parts filed under this sub-category. Scoped to one category when the caller
 * is drilling into one — inside Royal Enfield, "back lamp" should report the
 * Royal Enfield back lamps, not every back lamp in the workshop.
 */
function partsCountSql(categoryId?: string) {
  const scope = categoryId
    ? sql` and p.category_id = ${categoryId}`
    : sql``;
  return sql<number>`(
    select count(*)::int from ${parts} p
    where p.sub_category_id = "sub_categories"."id" and p.is_archived = false${scope}
  )`;
}

function selection(categoryId?: string) {
  return {
    id: subCategories.id,
    name: subCategories.name,
    description: subCategories.description,
    createdAt: subCategories.createdAt,
    updatedAt: subCategories.updatedAt,
    partsCount: partsCountSql(categoryId),
    categories: linkedCategoriesSql,
  };
}

const normalise = (row: any): SubCategoryRow => ({
  ...row,
  partsCount: Number(row.partsCount ?? 0),
  categories: (row.categories ?? []) as SubCategoryLink[],
});

// ─── Queries ─────────────────────────────────────────────────────────
/**
 * `categoryId` is the drill-down the merged inventory page makes when a
 * category tile is opened: an inner join on the link table, so only the
 * sub-categories actually mapped to that category come back.
 */
export async function listSubCategories(opts?: {
  categoryId?: string;
  q?: string;
}): Promise<SubCategoryRow[]> {
  const conditions = [];

  const categoryId = opts?.categoryId?.trim();
  if (categoryId) {
    conditions.push(sql`exists (
      select 1 from ${categorySubCategories} csc
      where csc.sub_category_id = ${subCategories.id} and csc.category_id = ${categoryId}
    )`);
  }

  const q = opts?.q?.trim();
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${subCategories.name}) like ${like} or lower(coalesce(${subCategories.description},'')) like ${like})`,
    );
  }

  const rows = await db
    .select(selection(categoryId))
    .from(subCategories)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(subCategories.name);

  return rows.map(normalise);
}

export async function getSubCategory(id: string): Promise<SubCategoryRow> {
  const [row] = await db
    .select(selection())
    .from(subCategories)
    .where(eq(subCategories.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "Sub-category not found", "NOT_FOUND");
  return normalise(row);
}

// ─── Helpers ─────────────────────────────────────────────────────────
async function findByName(name: string, excludeId?: string) {
  const conditions = [sql`lower(${subCategories.name}) = ${name.toLowerCase()}`];
  if (excludeId) conditions.push(sql`${subCategories.id} <> ${excludeId}`);
  const [row] = await db
    .select({ id: subCategories.id })
    .from(subCategories)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

/**
 * A sub-category without a category is not a thing this system has a place
 * for, so the requirement is enforced here rather than only in the sheet: at
 * least one id, and every id has to name a category that exists.
 */
async function assertCategoriesExist(categoryIds: string[]) {
  const unique = [...new Set(categoryIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!unique.length) {
    throw new ApiError(
      400,
      "Pick at least one category — a sub-category cannot stand on its own.",
      "SUBCATEGORY_NEEDS_CATEGORY",
    );
  }

  const found = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, unique));
  if (found.length !== unique.length) {
    throw new ApiError(400, "One of those categories no longer exists", "NOT_FOUND");
  }
  return unique;
}

async function countParts(subCategoryId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parts)
    .where(eq(parts.subCategoryId, subCategoryId));
  return Number(row?.count ?? 0);
}

// ─── Mutations ───────────────────────────────────────────────────────
export async function createSubCategory(input: {
  name: string;
  description?: string;
  categoryIds: string[];
}) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new ApiError(400, "Sub-category name is required");

  const categoryIds = await assertCategoriesExist(input.categoryIds ?? []);

  const clash = await findByName(name);
  if (clash) {
    throw new ApiError(
      409,
      `A sub-category named "${name}" already exists — link it to this category instead of making a second one.`,
      "SUBCATEGORY_EXISTS",
    );
  }

  const id = await db.transaction(async (tx: any) => {
    const [row] = await tx
      .insert(subCategories)
      .values({ name, description: input.description || null })
      .returning();
    await tx
      .insert(categorySubCategories)
      .values(categoryIds.map((categoryId) => ({ categoryId, subCategoryId: row.id })));
    return row.id as string;
  });

  return getSubCategory(id);
}

export async function updateSubCategory(
  id: string,
  input: { name?: string; description?: string; categoryIds?: string[] },
) {
  const [existing] = await db
    .select({ id: subCategories.id })
    .from(subCategories)
    .where(eq(subCategories.id, id))
    .limit(1);
  if (!existing) throw new ApiError(404, "Sub-category not found", "NOT_FOUND");

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new ApiError(400, "Sub-category name is required");
    const clash = await findByName(name, id);
    if (clash) {
      throw new ApiError(409, `A sub-category named "${name}" already exists`, "SUBCATEGORY_EXISTS");
    }
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description || null;
  }

  // Only validated when the caller is actually changing the links — a rename
  // must not have to resend them.
  const categoryIds =
    input.categoryIds !== undefined ? await assertCategoriesExist(input.categoryIds) : null;

  await db.transaction(async (tx: any) => {
    await tx.update(subCategories).set(patch).where(eq(subCategories.id, id));

    if (categoryIds) {
      // Replace wholesale. The join table carries nothing but the pairing, so
      // there is no per-row state a diff would preserve.
      await tx.delete(categorySubCategories).where(eq(categorySubCategories.subCategoryId, id));
      await tx
        .insert(categorySubCategories)
        .values(categoryIds.map((categoryId) => ({ categoryId, subCategoryId: id })));
    }
  });

  return getSubCategory(id);
}

/**
 * Sub-categories are deleted outright rather than archived. Parts still filed
 * under one block the delete until `force`, which unlinks them — the same
 * bargain `deleteCategory` offers, so the confirm reads the same way.
 */
export async function deleteSubCategory(id: string, opts?: { force?: boolean }) {
  const [existing] = await db
    .select({ id: subCategories.id })
    .from(subCategories)
    .where(eq(subCategories.id, id))
    .limit(1);
  if (!existing) throw new ApiError(404, "Sub-category not found", "NOT_FOUND");

  const inUse = await countParts(id);
  if (inUse > 0 && !opts?.force) {
    throw new ApiError(
      409,
      `${inUse} part(s) are still filed under this sub-category. Delete anyway to unlink them.`,
      "SUBCATEGORY_IN_USE",
    );
  }

  await db.transaction(async (tx: any) => {
    if (inUse > 0) {
      await tx
        .update(parts)
        .set({ subCategoryId: null, updatedAt: new Date() })
        .where(eq(parts.subCategoryId, id));
    }
    // The link rows cascade, but deleting them explicitly keeps this correct
    // if the constraint is ever relaxed.
    await tx.delete(categorySubCategories).where(eq(categorySubCategories.subCategoryId, id));
    await tx.delete(subCategories).where(eq(subCategories.id, id));
  });

  return { id, unlinkedParts: inUse };
}

/**
 * Guard for the parts endpoints: a part may only carry a sub-category that is
 * actually mapped to the category it sits in. Without this the two columns can
 * drift into saying different things about the same part.
 */
export async function assertSubCategoryInCategory(subCategoryId: string, categoryId?: string | null) {
  if (!categoryId) {
    throw new ApiError(
      400,
      "Pick a category before a sub-category — a sub-category is always read inside one.",
      "SUBCATEGORY_NEEDS_CATEGORY",
    );
  }
  const [link] = await db
    .select({ id: categorySubCategories.id })
    .from(categorySubCategories)
    .where(
      and(
        eq(categorySubCategories.subCategoryId, subCategoryId),
        eq(categorySubCategories.categoryId, categoryId),
      ),
    )
    .limit(1);
  if (!link) {
    throw new ApiError(
      400,
      "That sub-category is not filed under the chosen category",
      "SUBCATEGORY_NOT_IN_CATEGORY",
    );
  }
}
