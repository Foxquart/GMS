/**
 * Shapes the inventory screens share.
 *
 * These used to live inside the one page that rendered everything. Now that
 * browsing a category is its own route, both pages and the pieces they share
 * read the same definitions rather than three copies that drift.
 */
export type Part = {
  id: string;
  name: string;
  partNumber: string | null;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subCategoryId: string | null;
  subCategoryName: string | null;
  sellingPrice: string | null;
  unit: string | null;
  minimumShopStock: number;
  minimumWarehouseStock: number;
  shopStock: number;
  warehouseStock: number;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  partsCount: number;
  subCategoryCount: number;
};

export type SubCategory = {
  id: string;
  name: string;
  description: string | null;
  /** Every category this one is filed under — the many-to-many, spelled out. */
  categories: { id: string; name: string }[];
  partsCount: number;
};

/** What went wrong inside an open sheet, shown next to the fields. */
export type SheetError = { message: string; reference?: string };
