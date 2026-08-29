import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData } from "@/test/helpers";
import { db } from "@/server/db/connection";
import { parts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createCategory,
  deleteCategory,
  listCategories,
} from "@/server/services/category.service";
import {
  assertSubCategoryInCategory,
  createSubCategory,
  deleteSubCategory,
  listSubCategories,
  updateSubCategory,
} from "@/server/services/subcategory.service";

/** The worked example from the brief: one back lamp, two bikes. */
async function seedBikesAndBackLamp() {
  const royalEnfield = await createCategory({ name: "Royal Enfield" });
  const pulsar = await createCategory({ name: "Pulsar" });
  const backLamp = await createSubCategory({
    name: "Back lamp",
    categoryIds: [royalEnfield.id, pulsar.id],
  });
  return { royalEnfield, pulsar, backLamp };
}

describe("sub-category service", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("refuses a sub-category with no category", async () => {
    await expect(createSubCategory({ name: "Back lamp", categoryIds: [] })).rejects.toMatchObject({
      code: "SUBCATEGORY_NEEDS_CATEGORY",
    });
  });

  it("files one sub-category under several categories at once", async () => {
    const { royalEnfield, pulsar, backLamp } = await seedBikesAndBackLamp();

    expect(backLamp.categories.map((c) => c.name).sort()).toEqual(["Pulsar", "Royal Enfield"]);

    // The same row is reachable from both, rather than duplicated per category.
    const underRe = await listSubCategories({ categoryId: royalEnfield.id });
    const underPulsar = await listSubCategories({ categoryId: pulsar.id });
    expect(underRe.map((s) => s.id)).toEqual([backLamp.id]);
    expect(underPulsar.map((s) => s.id)).toEqual([backLamp.id]);
  });

  it("counts parts per category when drilling into one", async () => {
    const { royalEnfield, pulsar, backLamp } = await seedBikesAndBackLamp();

    await db.insert(parts).values([
      { name: "RE back lamp", categoryId: royalEnfield.id, subCategoryId: backLamp.id },
      { name: "RE back lamp lens", categoryId: royalEnfield.id, subCategoryId: backLamp.id },
      { name: "Pulsar back lamp", categoryId: pulsar.id, subCategoryId: backLamp.id },
    ]);

    const [underRe] = await listSubCategories({ categoryId: royalEnfield.id });
    const [underPulsar] = await listSubCategories({ categoryId: pulsar.id });
    const [unscoped] = await listSubCategories();

    expect(underRe.partsCount).toBe(2);
    expect(underPulsar.partsCount).toBe(1);
    expect(unscoped.partsCount).toBe(3);
  });

  it("reports the sub-category tally on each category", async () => {
    const { royalEnfield } = await seedBikesAndBackLamp();
    await createSubCategory({ name: "Clutch cable", categoryIds: [royalEnfield.id] });

    const rows = await listCategories();
    const re = rows.find((c: any) => c.id === royalEnfield.id);
    const pulsar = rows.find((c: any) => c.name === "Pulsar");
    expect(re.subCategoryCount).toBe(2);
    expect(pulsar.subCategoryCount).toBe(1);
  });

  it("replaces the mapping wholesale on update, and still needs one category", async () => {
    const { royalEnfield, pulsar, backLamp } = await seedBikesAndBackLamp();

    const moved = await updateSubCategory(backLamp.id, { categoryIds: [pulsar.id] });
    expect(moved.categories.map((c) => c.id)).toEqual([pulsar.id]);
    expect(await listSubCategories({ categoryId: royalEnfield.id })).toEqual([]);

    await expect(updateSubCategory(backLamp.id, { categoryIds: [] })).rejects.toMatchObject({
      code: "SUBCATEGORY_NEEDS_CATEGORY",
    });
  });

  it("rejects a part whose sub-category is not filed under its category", async () => {
    const { royalEnfield, pulsar, backLamp } = await seedBikesAndBackLamp();
    await updateSubCategory(backLamp.id, { categoryIds: [royalEnfield.id] });

    await expect(assertSubCategoryInCategory(backLamp.id, pulsar.id)).rejects.toMatchObject({
      code: "SUBCATEGORY_NOT_IN_CATEGORY",
    });
    await expect(assertSubCategoryInCategory(backLamp.id, null)).rejects.toMatchObject({
      code: "SUBCATEGORY_NEEDS_CATEGORY",
    });
    await expect(assertSubCategoryInCategory(backLamp.id, royalEnfield.id)).resolves.toBeUndefined();
  });

  it("blocks deleting a sub-category that parts still use, until forced", async () => {
    const { royalEnfield, backLamp } = await seedBikesAndBackLamp();
    const [part] = await db
      .insert(parts)
      .values({ name: "RE back lamp", categoryId: royalEnfield.id, subCategoryId: backLamp.id })
      .returning();

    await expect(deleteSubCategory(backLamp.id)).rejects.toMatchObject({
      code: "SUBCATEGORY_IN_USE",
    });

    const result = await deleteSubCategory(backLamp.id, { force: true });
    expect(result.unlinkedParts).toBe(1);

    const [after] = await db.select().from(parts).where(eq(parts.id, part.id));
    expect(after.subCategoryId).toBeNull();
    expect(after.categoryId).toBe(royalEnfield.id);
  });

  it("deleting a category only removes sub-categories left with no other home", async () => {
    const { royalEnfield, pulsar, backLamp } = await seedBikesAndBackLamp();
    const chainKit = await createSubCategory({
      name: "Chain kit",
      categoryIds: [royalEnfield.id],
    });

    const result = await deleteCategory(royalEnfield.id);
    // Back lamp survives on Pulsar; chain kit had nowhere else to go.
    expect(result.deletedSubCategories).toBe(1);

    const remaining = await listSubCategories();
    expect(remaining.map((s) => s.id)).toEqual([backLamp.id]);
    expect(remaining[0].categories.map((c) => c.id)).toEqual([pulsar.id]);
    expect(await listSubCategories({ categoryId: chainKit.id })).toEqual([]);
  });
});
