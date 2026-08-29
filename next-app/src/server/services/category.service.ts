import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { categories, parts } from "@/server/db/schema";
import { ApiError } from "@/server/lib/http";

// Default categories offered on a brand-new install, in display order.
export const DEFAULT_CATEGORIES = [
  "Body items",
  "Lights",
  "Engine parts",
  "Transmission",
  "Cables",
  "Tyre",
  "Switches",
] as const;

/**
 * Correlated count of parts in each category.
 *
 * The outer reference is written out as "categories"."id" on purpose. When the
 * outer query has no join, drizzle renders ${categories.id} as a bare "id",
 * which Postgres then resolves against the *subquery's* table — so this became
 * `parts.category_id = parts.id` and every category reported zero parts.
 */
const partsCountSql = sql<number>`(
  select count(*)::int from ${parts} p
  where p.category_id = "categories"."id" and p.is_archived = false
)`;

const categorySelection = {
  id: categories.id,
  name: categories.name,
  description: categories.description,
  isArchived: categories.isArchived,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
  partsCount: partsCountSql,
};

// ─── Queries ─────────────────────────────────────────────────────────
export async function listCategories(opts?: { q?: string; includeArchived?: boolean }) {
  const conditions = [];
  if (!opts?.includeArchived) {
    conditions.push(eq(categories.isArchived, false));
  }
  const q = opts?.q?.trim();
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${categories.name}) like ${like} or lower(coalesce(${categories.description},'')) like ${like})`,
    );
  }

  const rows = await db
    .select(categorySelection)
    .from(categories)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(categories.name);

  return rows.map((r: any) => ({ ...r, partsCount: Number(r.partsCount ?? 0) }));
}

export async function getCategory(id: string) {
  const [row] = await db
    .select(categorySelection)
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "Category not found");
  return { ...row, partsCount: Number(row.partsCount ?? 0) };
}

async function findByName(name: string, excludeId?: string) {
  const conditions = [sql`lower(${categories.name}) = ${name.toLowerCase()}`];
  if (excludeId) conditions.push(sql`${categories.id} <> ${excludeId}`);
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

async function countParts(categoryId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parts)
    .where(eq(parts.categoryId, categoryId));
  return Number(row?.count ?? 0);
}

// ─── Mutations ───────────────────────────────────────────────────────
export async function createCategory(input: { name: string; description?: string }) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new ApiError(400, "Category name is required");

  const clash = await findByName(name);
  if (clash) throw new ApiError(409, `A category named "${name}" already exists`);

  const [row] = await db
    .insert(categories)
    .values({ name, description: input.description || null })
    .returning();
  return row;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string; isArchived?: boolean },
) {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) throw new ApiError(404, "Category not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new ApiError(400, "Category name is required");
    const clash = await findByName(name, id);
    if (clash) throw new ApiError(409, `A category named "${name}" already exists`);
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description || null;
  }
  if (input.isArchived !== undefined) {
    patch.isArchived = Boolean(input.isArchived);
  }

  const [row] = await db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, id))
    .returning();
  return row;
}

export async function deleteCategory(id: string, opts?: { force?: boolean }) {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) throw new ApiError(404, "Category not found");

  const inUse = await countParts(id);
  if (inUse > 0 && !opts?.force) {
    throw new ApiError(
      409,
      `${inUse} part(s) still use this category. Archive it instead, or delete with force to unlink them.`,
      "CATEGORY_IN_USE",
    );
  }

  await db.transaction(async (tx: any) => {
    if (inUse > 0) {
      await tx
        .update(parts)
        .set({ categoryId: null, updatedAt: new Date() })
        .where(eq(parts.categoryId, id));
    }
    await tx.delete(categories).where(eq(categories.id, id));
  });

  return { id, unlinkedParts: inUse };
}

// ─── Seeding ─────────────────────────────────────────────────────────
export async function seedDefaultCategories(dbInstance: any = db) {
  // Only seed when the categories table is completely empty. This is deliberate:
  // the user must be able to permanently delete a default category without it
  // reappearing on the next boot.
  const [existing] = await dbInstance.select({ id: categories.id }).from(categories).limit(1);
  if (existing) return 0;

  await dbInstance
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((name) => ({ name })));
  return DEFAULT_CATEGORIES.length;
}
