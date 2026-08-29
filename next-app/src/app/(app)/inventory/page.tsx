"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  Search,
  Plus,
  ArrowLeftRight,
  Store,
  Warehouse,
  X,
  Layers,
  Tags,
  Pencil,
  Check,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotOilCan, SpotTools } from "@/components/illustrations";
import { currency } from "@/lib/format";
import { REFERENCE_QUERY } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

type Part = {
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

type Category = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  partsCount: number;
  subCategoryCount: number;
};

type SubCategory = {
  id: string;
  name: string;
  description: string | null;
  partsCount: number;
  /** Every category this one is filed under — the many-to-many, spelled out. */
  categories: { id: string; name: string }[];
};

type Location = "SHOP" | "WAREHOUSE";

/** `label` is the full spoken name — the control itself shows only the icon. */
const LOCATIONS: { value: Location; label: string; icon: typeof Store }[] = [
  { value: "SHOP", label: "Shop stock", icon: Store },
  { value: "WAREHOUSE", label: "Warehouse stock", icon: Warehouse },
];

/** Health of one location's balance, in the colour language of the system. */
function health(stock: number, min: number) {
  if (stock <= 0) return "out" as const;
  if (stock < min) return "low" as const;
  return "ok" as const;
}

const healthColor = (h: ReturnType<typeof health>) =>
  h === "out" ? "red" : h === "low" ? "amber" : "blue";

// A three-way segmented control could not hold these labels plus their counts
// on one row — they clipped to "A.. / L... / O...". A dropdown shows the full
// name of every option and takes one line whatever the wording.
const STATUS_FILTERS = [
  { value: "ALL", label: "All parts" },
  { value: "LOW", label: "Low stock" },
  { value: "OUT", label: "Out of stock" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

/** What went wrong inside the open sheet, shown next to the fields. */
type SheetError = { message: string; reference?: string };

const asSheetError = (err: unknown): SheetError => ({
  message: errorMessage(err),
  reference: errorReference(err),
});

export default function InventoryPage() {
  // useSearchParams() must sit inside a Suspense boundary (App Router).
  return (
    <Suspense
      fallback={
        // Same shape as loading.tsx, so the two never disagree on the layout.
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-64 rounded-[var(--r-panel)]" />
          <StickyControls className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-[52px] w-[118px] rounded-full" />
              <Skeleton className="h-[52px] flex-1 basis-[188px] rounded-full" />
            </div>
            <Skeleton className="h-11 rounded-[var(--r-control)]" />
          </StickyControls>
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-28 rounded-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        </div>
      }
    >
      <InventoryBrowser />
    </Suspense>
  );
}

function InventoryBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  // The filter lives in the URL so a narrowed shelf can be linked to and
  // survives a refresh — the same contract the standalone categories page had.
  const categoryId = searchParams.get("categoryId") ?? "";
  const subCategoryId = searchParams.get("subCategoryId") ?? "";

  const setFilter = (next: { categoryId?: string; subCategoryId?: string }) => {
    const sp = new URLSearchParams();
    if (next.categoryId) sp.set("categoryId", next.categoryId);
    if (next.subCategoryId) sp.set("subCategoryId", next.subCategoryId);
    const qs = sp.toString();
    router.replace(qs ? `/inventory?${qs}` : "/inventory", { scroll: false });
  };

  const [tab, setTab] = useState<Location>("SHOP");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const [showArchived, setShowArchived] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // Archived categories come back with the rest and are filtered here rather
  // than refetched. Two reasons: toggling the view costs no round trip, and
  // the count is known — so "Show archived" can hide itself when there is
  // nothing archived to show instead of being a control that does nothing.
  const categoriesQuery = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api<Category[]>("/api/categories", { params: { archived: "1" } }),
    ...REFERENCE_QUERY,
  });
  const allCategories = categoriesQuery.data;
  const archivedCount = (allCategories ?? []).filter((c) => c.isArchived).length;
  const categories = showArchived
    ? allCategories
    : allCategories?.filter((c) => !c.isArchived);

  // The drill-down: opening a category is what fetches its sub-categories.
  const subCategoriesQuery = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () => api<SubCategory[]>("/api/subcategories", { params: { categoryId } }),
    enabled: Boolean(categoryId),
    ...REFERENCE_QUERY,
  });
  const subCategories = categoryId ? subCategoriesQuery.data : undefined;

  const { data: parts, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["inventory", search, categoryId, subCategoryId],
    queryFn: () =>
      api<Part[]>("/api/parts", {
        params: {
          q: search || undefined,
          categoryId: categoryId || undefined,
          subCategoryId: subCategoryId || undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const selectedCategory = (allCategories ?? []).find((c) => c.id === categoryId);
  const selectedSubCategory = (subCategories ?? []).find((s) => s.id === subCategoryId);

  // A sub-category id in the URL that this category does not carry would leave
  // the parts list empty with no visible reason, so it is dropped.
  useEffect(() => {
    if (!subCategoryId) return;
    if (!categoryId) {
      setFilter({});
      return;
    }
    const rows = subCategoriesQuery.data;
    if (rows && !rows.some((s) => s.id === subCategoryId)) {
      setFilter({ categoryId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subCategoryId, categoryId, subCategoriesQuery.data]);

  const stockFor = (p: Part) => Number((tab === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0);
  const minFor = (p: Part) =>
    Number((tab === "SHOP" ? p.minimumShopStock : p.minimumWarehouseStock) ?? 0);

  const rows = parts ?? [];
  const totalParts = rows.length;
  const lowCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "low").length;
  const outCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "out").length;
  const unitsIn = (loc: Location) =>
    rows.reduce((sum, p) => sum + Number((loc === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0), 0);
  const here = tab === "SHOP" ? "shop" : "warehouse";

  const statusCount = (value: StatusFilter) =>
    value === "ALL" ? totalParts : value === "LOW" ? lowCount : outCount;

  // Filtering happens on the list already in hand — switching Low/Out must not
  // cost a round trip.
  const visible = rows.filter((p) => {
    if (status === "ALL") return true;
    const h = health(stockFor(p), minFor(p));
    return status === "LOW" ? h === "low" : h === "out";
  });

  // ─── Category sheet ────────────────────────────────────────────────
  const [catSheet, setCatSheet] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catConfirmDelete, setCatConfirmDelete] = useState(false);
  const [catInUse, setCatInUse] = useState<string | null>(null);
  const [catError, setCatError] = useState<SheetError | null>(null);

  const resetCatSheet = () => {
    setCatSheet(false);
    setEditingCat(null);
    setCatName("");
    setCatDescription("");
    setCatConfirmDelete(false);
    setCatInUse(null);
    setCatError(null);
  };

  const openNewCat = () => {
    resetCatSheet();
    setCatSheet(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatName(c.name);
    setCatDescription(c.description ?? "");
    setCatConfirmDelete(false);
    setCatInUse(null);
    setCatError(null);
    setCatSheet(true);
  };

  const invalidateCategories = () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["subcategories"] });
  };
  const invalidateParts = () => qc.invalidateQueries({ queryKey: ["inventory"] });

  const createCategory = useMutation({
    mutationFn: () =>
      api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName, description: catDescription || undefined }),
      }),
    onSuccess: () => {
      toast.success("Category created");
      resetCatSheet();
      invalidateCategories();
    },
    // The sheet stays open on failure, so the error goes in it — a toast
    // would slide away from the fields that need changing.
    onError: (err) => setCatError(asSheetError(err)),
  });

  const saveCategory = useMutation({
    mutationFn: () =>
      api(`/api/categories/${editingCat!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: catName, description: catDescription }),
      }),
    onSuccess: () => {
      toast.success("Category updated");
      resetCatSheet();
      invalidateCategories();
      invalidateParts();
    },
    onError: (err) => setCatError(asSheetError(err)),
  });

  const setCategoryArchived = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      api(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify({ isArchived }) }),
    onSuccess: (_data, vars) => {
      toast.success(vars.isArchived ? "Category archived" : "Category restored");
      resetCatSheet();
      invalidateCategories();
    },
    onError: (err) => setCatError(asSheetError(err)),
  });

  const removeCategory = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api<{ id: string; unlinkedParts: number; deletedSubCategories: number }>(
        `/api/categories/${id}`,
        { method: "DELETE", params: force ? { force: "1" } : undefined },
      ),
    onSuccess: (data, vars) => {
      const bits = [
        data?.unlinkedParts ? `${data.unlinkedParts} part(s) unlinked` : null,
        data?.deletedSubCategories
          ? `${data.deletedSubCategories} sub-categor${data.deletedSubCategories === 1 ? "y" : "ies"} removed`
          : null,
      ].filter(Boolean);
      toast.success(bits.length ? `Category deleted — ${bits.join(", ")}` : "Category deleted");
      if (vars.id === categoryId) setFilter({});
      resetCatSheet();
      invalidateCategories();
      invalidateParts();
    },
    onError: (err) => {
      // The parts are still filed under it. That is not a dead end: the
      // confirm turns into "Delete anyway", which unlinks them.
      if (err instanceof ApiClientError && err.code === "CATEGORY_IN_USE") {
        setCatInUse(err.message);
        return;
      }
      setCatError(asSheetError(err));
    },
  });

  // ─── Sub-category sheet ────────────────────────────────────────────
  const [subSheet, setSubSheet] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subCategoryIds, setSubCategoryIds] = useState<string[]>([]);
  const [subConfirmDelete, setSubConfirmDelete] = useState(false);
  const [subInUse, setSubInUse] = useState<string | null>(null);
  const [subError, setSubError] = useState<SheetError | null>(null);

  const resetSubSheet = () => {
    setSubSheet(false);
    setEditingSub(null);
    setSubName("");
    setSubDescription("");
    setSubCategoryIds([]);
    setSubConfirmDelete(false);
    setSubInUse(null);
    setSubError(null);
  };

  /**
   * A new sub-category always opens from inside a category, so that category
   * is pre-ticked — the "at least one" rule is satisfied before the first
   * keystroke rather than enforced by a rejection afterwards.
   */
  const openNewSub = () => {
    resetSubSheet();
    setSubCategoryIds(categoryId ? [categoryId] : []);
    setSubSheet(true);
  };

  const openEditSub = (s: SubCategory) => {
    setEditingSub(s);
    setSubName(s.name);
    setSubDescription(s.description ?? "");
    setSubCategoryIds(s.categories.map((c) => c.id));
    setSubConfirmDelete(false);
    setSubInUse(null);
    setSubError(null);
    setSubSheet(true);
  };

  const toggleSubCategoryLink = (id: string) => {
    setSubError(null);
    setSubCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const invalidateSubCategories = () => {
    qc.invalidateQueries({ queryKey: ["subcategories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const createSubCategory = useMutation({
    mutationFn: () =>
      api("/api/subcategories", {
        method: "POST",
        body: JSON.stringify({
          name: subName,
          description: subDescription || undefined,
          categoryIds: subCategoryIds,
        }),
      }),
    onSuccess: () => {
      toast.success("Sub-category created");
      resetSubSheet();
      invalidateSubCategories();
    },
    onError: (err) => setSubError(asSheetError(err)),
  });

  const saveSubCategory = useMutation({
    mutationFn: () =>
      api(`/api/subcategories/${editingSub!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: subName,
          description: subDescription,
          categoryIds: subCategoryIds,
        }),
      }),
    onSuccess: () => {
      toast.success("Sub-category updated");
      resetSubSheet();
      invalidateSubCategories();
      invalidateParts();
    },
    onError: (err) => setSubError(asSheetError(err)),
  });

  const removeSubCategory = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api<{ id: string; unlinkedParts: number }>(`/api/subcategories/${id}`, {
        method: "DELETE",
        params: force ? { force: "1" } : undefined,
      }),
    onSuccess: (data, vars) => {
      toast.success(
        data?.unlinkedParts
          ? `Sub-category deleted — ${data.unlinkedParts} part(s) unlinked`
          : "Sub-category deleted",
      );
      if (vars.id === subCategoryId) setFilter({ categoryId });
      resetSubSheet();
      invalidateSubCategories();
      invalidateParts();
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.code === "SUBCATEGORY_IN_USE") {
        setSubInUse(err.message);
        return;
      }
      setSubError(asSheetError(err));
    },
  });

  const subSaving = createSubCategory.isPending || saveSubCategory.isPending;

  return (
    <div className="space-y-5">
      {/* The heading and the actions scroll away. Measured on a 360×640 phone:
          pinning this row as well put 243px of chrome above a 310px list — the
          list has to win that argument, so only the controls that change what
          it shows stay put. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
            Categories, sub-categories and everything on the shelves.
          </p>
        </div>

        {/* Icon-only in the title row so the actions cost no vertical space.
            Labelled for screen readers and tooltipped for sighted users, per
            the rule against unlabelled icon-only controls. */}
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/inventory/transfers" aria-label="Transfer stock" title="Transfer stock">
            <Button variant="outline" size="icon" className="h-11 w-11">
              <ArrowLeftRight size={18} />
            </Button>
          </Link>
          <Link href="/inventory/parts/new" aria-label="New part" title="New part">
            <Button size="icon" className="h-11 w-11">
              <Plus size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Category panel ─────────────────────────────────────────── */}
      <CategoryPanel
        open={panelOpen}
        onToggleOpen={() => setPanelOpen((v) => !v)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((v) => !v)}
        archivedCount={archivedCount}
        query={categoriesQuery}
        categories={categories}
        categoryId={categoryId}
        subCategoryId={subCategoryId}
        selectedCategory={selectedCategory}
        selectedSubCategory={selectedSubCategory}
        subCategories={subCategories}
        subCategoriesQuery={subCategoriesQuery}
        onSelectCategory={(id) => setFilter(id === categoryId ? {} : { categoryId: id })}
        onSelectSubCategory={(id) =>
          setFilter(
            id === subCategoryId ? { categoryId } : { categoryId, subCategoryId: id },
          )
        }
        onNewCategory={openNewCat}
        onEditCategory={openEditCat}
        onNewSubCategory={openNewSub}
        onEditSubCategory={openEditSub}
      />

      {/* Pinned: where the stock sits, what condition it is in, and the search.
          130px of controls — the list keeps the rest of the screen. */}
      <StickyControls className="space-y-2.5">
        {/* Two different axes — where the stock sits, and what condition it is
            in — so they stay two tracks with a gap between them and never read
            as one five-option control. Under ~314px of row they wrap back to
            two lines rather than squashing below a 44px target. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Where. Icon and count only at this size; the words are carried by
              the accessible name and the tooltip. */}
          <div className="relative isolate flex shrink-0 select-none rounded-full bg-[var(--surface-sunk)] p-1">
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-full bg-[var(--forest)]",
                "transition-transform duration-200 ease-out",
                tab === "WAREHOUSE" && "translate-x-full",
              )}
            />
            {LOCATIONS.map((loc) => {
              const active = tab === loc.value;
              const units = unitsIn(loc.value);
              return (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setTab(loc.value)}
                  aria-pressed={active}
                  aria-label={`${loc.label}, ${units} units`}
                  title={`${loc.label} — ${units} units`}
                  className={cn(
                    "relative z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5",
                    "transition-[color] duration-150 ease-out",
                    active
                      ? "text-[var(--ink-on-dark)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  <loc.icon size={14} aria-hidden />
                  <span aria-hidden className="numeral ml-1.5 text-xs leading-none">
                    {units}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Condition. A dropdown rather than a third segmented control:
              the full label is always readable and the row stays one line. */}
          <AnimatedDropdown
            className="min-w-0 flex-1"
            options={STATUS_FILTERS.map((f) => {
              const count = statusCount(f.value);
              return { id: f.value, name: `${f.label} (${count})` };
            })}
            value={status}
            onChange={(v: string) => setStatus((v || "ALL") as StatusFilter)}
            placeholder="All parts"
          />
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
            onBlur={() => setSearch(q)}
            placeholder="Search by name, part number"
            aria-label="Search parts"
            className="pl-11 pr-11"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSearch("");
              }}
              aria-label="Clear search"
              className={cn(
                "absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
                "text-[var(--ink-label)] transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </StickyControls>

      {/* ── Parts list ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title={
            search
              ? `Results for “${search}”`
              : selectedSubCategory
                ? selectedSubCategory.name
                : selectedCategory
                  ? selectedCategory.name
                  : status === "LOW"
                    ? `Low in the ${here}`
                    : status === "OUT"
                      ? `Out in the ${here}`
                      : "All parts"
          }
          action={
            <span className="tile-label text-[var(--ink-label)]">
              {isFetching && !isPending ? "Updating…" : `${visible.length} listed`}
            </span>
          }
        />

        {isPending ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load your parts"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : !rows.length ? (
          <EmptyState
            illustration={search ? <SpotTools size={84} /> : <SpotOilCan size={84} />}
            title={
              search
                ? "No parts match that search"
                : selectedSubCategory
                  ? `Nothing is filed under ${selectedSubCategory.name} yet`
                  : selectedCategory
                    ? `Nothing is filed under ${selectedCategory.name} yet`
                    : "The shelves are empty"
            }
            description={
              search
                ? "Try a shorter search — part numbers and brands are matched too."
                : categoryId
                  ? "Add a part here, or pick a different category above."
                  : "Add your first part and its shop and warehouse levels will be tracked from here."
            }
            action={
              search ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setSearch("");
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <Link href="/inventory/parts/new">
                  <Button>
                    <Plus size={16} /> New part
                  </Button>
                </Link>
              )
            }
          />
        ) : !visible.length ? (
          <EmptyState
            illustration={<SpotTools size={84} />}
            title={status === "LOW" ? `Nothing is low in the ${here}` : `Nothing is out in the ${here}`}
            description={
              status === "LOW"
                ? "Every part is at or above its minimum level for this location."
                : "Every part still has stock on the shelf for this location."
            }
            action={
              <Button variant="outline" onClick={() => setStatus("ALL")}>
                Show all parts
              </Button>
            }
          />
        ) : (
          <ul className={cn("space-y-2.5", isFetching && !isPending && "opacity-70")}>
            {visible.map((p) => {
              const shop = Number(p.shopStock ?? 0);
              const warehouse = Number(p.warehouseStock ?? 0);
              const shopHealth = health(shop, Number(p.minimumShopStock ?? 0));
              const whHealth = health(warehouse, Number(p.minimumWarehouseStock ?? 0));
              const activeHealth = tab === "SHOP" ? shopHealth : whHealth;

              return (
                <li key={p.id}>
                  <Link
                    href={`/inventory/parts/${p.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5",
                      "transition-[background-color,border-color,transform] duration-150 ease-out",
                      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:scale-[0.995]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-control)]",
                        activeHealth === "out" && "bg-[var(--terracotta)] text-[#fdf6f2]",
                        activeHealth === "low" && "bg-[var(--ochre)] text-[var(--forest-deep)]",
                        activeHealth === "ok" && "bg-[var(--sage)] text-[var(--forest)]",
                      )}
                    >
                      <Package size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {p.partNumber || "No part number"} · {p.brand || "No brand"}
                      </p>
                      {/* Only worth a third line when the list is not already
                          narrowed to that sub-category. */}
                      {!subCategoryId && p.subCategoryName && (
                        <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--ink-label)]">
                          {p.categoryName ? `${p.categoryName} · ` : ""}
                          {p.subCategoryName}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {/* The active location is coloured by its health; the
                          other stays quiet so the toggle actually means
                          something. Both are shrink-0 and never wrap. */}
                      <div className="flex items-center gap-1.5">
                        <Badge color={tab === "SHOP" ? healthColor(shopHealth) : "gray"}>
                          Shop {shop}
                        </Badge>
                        <Badge color={tab === "WAREHOUSE" ? healthColor(whHealth) : "gray"}>
                          W/h {warehouse}
                        </Badge>
                      </div>
                      <span className="tabular text-xs font-bold text-[var(--ink-muted)]">
                        {currency(p.sellingPrice)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Category sheet ─────────────────────────────────────────── */}
      <Sheet
        open={catSheet}
        onClose={resetCatSheet}
        title={editingCat ? "Edit category" : "New category"}
      >
        <div className="space-y-3.5">
          {catError && <InlineError message={catError.message} reference={catError.reference} />}
          <Field label="Name">
            <Input
              value={catName}
              onChange={(e) => {
                setCatName(e.target.value);
                setCatError(null);
              }}
              placeholder="Royal Enfield"
            />
          </Field>
          <Field label="Description">
            <Input
              value={catDescription}
              onChange={(e) => {
                setCatDescription(e.target.value);
                setCatError(null);
              }}
              placeholder="Everything that fits a Royal Enfield"
            />
          </Field>

          {editingCat ? (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={() => saveCategory.mutate()}
                disabled={!catName || saveCategory.isPending}
              >
                {saveCategory.isPending ? "Saving…" : "Save changes"}
              </Button>

              {/* Archiving used to be a button on the tile, which put a rare
                  action in front of everyone permanently. It belongs with the
                  other thing you do to a category you are done with. */}
              <Button
                variant="outline"
                className="w-full"
                disabled={setCategoryArchived.isPending}
                onClick={() =>
                  setCategoryArchived.mutate({
                    id: editingCat.id,
                    isArchived: !editingCat.isArchived,
                  })
                }
              >
                {editingCat.isArchived ? "Restore category" : "Archive category"}
              </Button>

              {!catConfirmDelete ? (
                <button
                  onClick={() => {
                    setCatConfirmDelete(true);
                    setCatInUse(null);
                    setCatError(null);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-full px-2 py-2 text-xs font-bold text-[var(--ink-label)]",
                    "transition-[background-color,color] duration-150 ease-out",
                    "hover:bg-[var(--terracotta)]/10 hover:text-[var(--terracotta-hover)]",
                  )}
                >
                  Delete category
                </button>
              ) : (
                <div className="space-y-3 rounded-[var(--r-tile)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 p-3.5">
                  <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                    {catInUse ??
                      `Delete “${editingCat.name}” permanently? This cannot be undone.`}
                  </p>
                  {editingCat.subCategoryCount > 0 && (
                    <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                      Its {editingCat.subCategoryCount} sub-categor
                      {editingCat.subCategoryCount === 1 ? "y" : "ies"} will be unlinked, and any
                      that are filed under no other category will be deleted with it.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCatConfirmDelete(false);
                        setCatInUse(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      disabled={removeCategory.isPending}
                      onClick={() =>
                        removeCategory.mutate({ id: editingCat.id, force: Boolean(catInUse) })
                      }
                    >
                      {catInUse
                        ? `Delete anyway (unlink ${editingCat.partsCount} part${editingCat.partsCount === 1 ? "" : "s"})`
                        : "Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={() => createCategory.mutate()}
              disabled={!catName || createCategory.isPending}
            >
              {createCategory.isPending ? "Creating…" : "Create category"}
            </Button>
          )}
        </div>
      </Sheet>

      {/* ── Sub-category sheet ─────────────────────────────────────── */}
      <Sheet
        open={subSheet}
        onClose={resetSubSheet}
        title={editingSub ? "Edit sub-category" : "New sub-category"}
      >
        <div className="space-y-3.5">
          {subError && <InlineError message={subError.message} reference={subError.reference} />}
          <Field label="Name">
            <Input
              value={subName}
              onChange={(e) => {
                setSubName(e.target.value);
                setSubError(null);
              }}
              placeholder="Back lamp"
            />
          </Field>
          <Field label="Description">
            <Input
              value={subDescription}
              onChange={(e) => {
                setSubDescription(e.target.value);
                setSubError(null);
              }}
              placeholder="Tail lamps, lenses and holders"
            />
          </Field>

          {/* The whole point of the many-to-many: one "Back lamp" listed under
              Royal Enfield and Pulsar at once, rather than two rows that only
              happen to share a name. */}
          <Field
            label="Categories"
            hint="A sub-category always belongs to at least one category, and can belong to several."
          >
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface)] p-2">
              {!categories?.length ? (
                <p className="px-2 py-3 text-xs font-semibold text-[var(--ink-muted)]">
                  Create a category first — there is nothing to file this under yet.
                </p>
              ) : (
                categories.map((c) => {
                  const checked = subCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleSubCategoryLink(c.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--r-tile)] px-2.5 py-2 text-left",
                        "transition-[background-color] duration-150 ease-out",
                        checked ? "bg-[var(--sage)]" : "hover:bg-[var(--surface-sunk)]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                          checked
                            ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                            : "border-[var(--hairline-strong)] bg-[var(--surface-bright)]",
                        )}
                      >
                        {checked && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-xs font-extrabold",
                          checked ? "text-[var(--forest)]" : "text-[var(--ink)]",
                        )}
                      >
                        {c.name}
                      </span>
                      {c.isArchived && <Badge color="gray">Archived</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          </Field>

          <Button
            className="w-full"
            size="lg"
            onClick={() => (editingSub ? saveSubCategory : createSubCategory).mutate()}
            disabled={!subName || !subCategoryIds.length || subSaving}
          >
            {subSaving
              ? editingSub
                ? "Saving…"
                : "Creating…"
              : editingSub
                ? "Save changes"
                : "Create sub-category"}
          </Button>

          {editingSub &&
            (!subConfirmDelete ? (
              <button
                onClick={() => {
                  setSubConfirmDelete(true);
                  setSubInUse(null);
                  setSubError(null);
                }}
                className={cn(
                  "w-full cursor-pointer rounded-full px-2 py-2 text-xs font-bold text-[var(--ink-label)]",
                  "transition-[background-color,color] duration-150 ease-out",
                  "hover:bg-[var(--terracotta)]/10 hover:text-[var(--terracotta-hover)]",
                )}
              >
                Delete sub-category
              </button>
            ) : (
              <div className="space-y-3 rounded-[var(--r-tile)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 p-3.5">
                <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                  {subInUse ??
                    `Delete “${editingSub.name}” from every category it is filed under? This cannot be undone.`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSubConfirmDelete(false);
                      setSubInUse(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    disabled={removeSubCategory.isPending}
                    onClick={() =>
                      removeSubCategory.mutate({ id: editingSub.id, force: Boolean(subInUse) })
                    }
                  >
                    {subInUse ? "Delete anyway" : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </Sheet>
    </div>
  );
}
/**
 * The category grid and, once a category is opened, the sub-categories filed
 * under it — the whole of what used to be /inventory/categories.
 *
 * There is no edit mode. There was: a toggle that revealed a pencil and an
 * Archive button on every tile, plus the only route to creating a
 * sub-category. It meant four steps of discovery — find the toggle, turn it
 * on, work out that a tile must be opened, then find the chip — before the
 * button you wanted existed at all. Nobody thinks "first I enter edit mode";
 * they think "add a sub-category under Lights".
 *
 * So management now lives inside the thing being managed. A tile does one
 * thing: open the category. Everything about that category — its name, its
 * sub-categories, archiving it, deleting it — appears once it is open, which
 * is where someone looking for it would look. The grid stays clean for the
 * common case, which is browsing.
 */
function CategoryPanel({
  open,
  onToggleOpen,
  showArchived,
  onToggleArchived,
  archivedCount,
  query,
  categories,
  categoryId,
  subCategoryId,
  selectedCategory,
  selectedSubCategory,
  subCategories,
  subCategoriesQuery,
  onSelectCategory,
  onSelectSubCategory,
  onNewCategory,
  onEditCategory,
  onNewSubCategory,
  onEditSubCategory,
}: {
  open: boolean;
  onToggleOpen: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  archivedCount: number;
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => void };
  categories: Category[] | undefined;
  categoryId: string;
  subCategoryId: string;
  selectedCategory: Category | undefined;
  selectedSubCategory: SubCategory | undefined;
  subCategories: SubCategory[] | undefined;
  subCategoriesQuery: { isPending: boolean; isError: boolean; refetch: () => void };
  onSelectCategory: (id: string) => void;
  onSelectSubCategory: (id: string) => void;
  onNewCategory: () => void;
  onEditCategory: (c: Category) => void;
  onNewSubCategory: () => void;
  onEditSubCategory: (s: SubCategory) => void;
}) {
  return (
    <section className="rounded-[var(--r-panel)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4">
      <SectionHeader
        className="mb-3.5"
        title={
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={open}
            aria-controls="category-panel-body"
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
          >
            <span className="truncate">Category</span>
            <ChevronDown
              size={15}
              className={cn(
                "shrink-0 text-[var(--ink-label)] transition-transform duration-150 ease-out",
                !open && "-rotate-90",
              )}
            />
          </button>
        }
        icon={<Layers size={16} />}
      />

      {/* Collapsed, the panel still says what the list below is narrowed to —
          otherwise the parts list would look unexplainably short. */}
      {!open ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedCategory ? (
            <>
              <Badge color="blue">
                <Layers size={12} />
                {selectedCategory.name}
              </Badge>
              {selectedSubCategory && (
                <Badge color="slate">
                  <Tags size={12} />
                  {selectedSubCategory.name}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              Showing every category.
            </span>
          )}
        </div>
      ) : (
        <div id="category-panel-body" className="space-y-3.5">
          {query.isPending ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[92px]" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Couldn't load your categories"
              message={errorMessage(query.error)}
              reference={errorReference(query.error)}
              onRetry={() => query.refetch()}
            />
          ) : selectedCategory ? (
            /* ── Inside one category ─────────────────────────────────
               The grid folds away rather than staying above this. Measured on
               a 360x640 phone: with eight categories the tiles are ~460px, so
               leaving them up pushed the parts list — the thing picking a
               category was meant to change — off the bottom of the screen.
               You tapped a tile and nothing you could see happened. Collapsed,
               the list rises about 400px and lands under your thumb, and the
               search, location and stock filters stay exactly where they were,
               which a separate page would have had to rebuild or drop. */
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onSelectCategory(selectedCategory.id)}
                className={cn(
                  "-ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-1 text-xs font-bold",
                  "text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:text-[var(--ink)]",
                )}
              >
                <ChevronLeft size={14} />
                All categories
              </button>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
                    <span className="truncate">{selectedCategory.name}</span>
                    {selectedCategory.isArchived && <Badge color="gray">Archived</Badge>}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {selectedCategory.partsCount}{" "}
                    {selectedCategory.partsCount === 1 ? "part" : "parts"} ·{" "}
                    {selectedCategory.subCategoryCount} sub-categor
                    {selectedCategory.subCategoryCount === 1 ? "y" : "ies"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEditCategory(selectedCategory)}
                  className={cn(
                    "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold",
                    "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
                    "transition-[background-color,color] duration-150 ease-out",
                    "hover:bg-[var(--hairline)] hover:text-[var(--ink)]",
                  )}
                >
                  <Pencil size={12} /> Edit
                </button>
              </div>

              <div className="space-y-2.5 border-t border-[var(--hairline)] pt-3">
                <p className="tile-label flex items-center gap-1.5 text-[var(--ink-label)]">
                  <Tags size={13} />
                  Sub-categories
                  {subCategoryId && (
                    <button
                      type="button"
                      onClick={() => onSelectSubCategory(subCategoryId)}
                      className="ml-auto cursor-pointer text-xs font-bold normal-case tracking-normal text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
                    >
                      Clear
                    </button>
                  )}
                </p>

                {subCategoriesQuery.isPending ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-28 rounded-full" />
                    ))}
                  </div>
                ) : subCategoriesQuery.isError ? (
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--ink-muted)]">
                    <span>Couldn&apos;t load these sub-categories.</span>
                    <button
                      onClick={() => subCategoriesQuery.refetch()}
                      className="cursor-pointer font-bold text-[var(--ink)] underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subCategories?.map((s) => {
                      const active = s.id === subCategoryId;
                      // A sub-category shared with other categories is the
                      // normal case here, and worth saying — it is why editing
                      // one shows up everywhere it is filed.
                      const shared = s.categories.length > 1;
                      return (
                        <span key={s.id} className="inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => onSelectSubCategory(s.id)}
                            aria-pressed={active}
                            title={
                              shared
                                ? `Also in ${s.categories
                                    .filter((c) => c.id !== categoryId)
                                    .map((c) => c.name)
                                    .join(", ")}`
                                : undefined
                            }
                            className={cn(
                              "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full rounded-r-none border border-r-0 py-1 pl-3.5 pr-2.5 text-xs font-extrabold",
                              "transition-[background-color,border-color,color] duration-150 ease-out",
                              active
                                ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                                : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-sunk)]",
                            )}
                          >
                            <span className="max-w-[12rem] truncate">{s.name}</span>
                            <span
                              className={cn(
                                "numeral text-[11px] leading-none",
                                active ? "text-[var(--sage)]" : "text-[var(--ink-label)]",
                              )}
                            >
                              {s.partsCount}
                            </span>
                            {shared && (
                              <span
                                aria-hidden
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  active ? "bg-[var(--ochre)]" : "bg-[var(--forest)]/45",
                                )}
                              />
                            )}
                          </button>
                          {/* Welded to the chip rather than hidden behind a
                              mode: renaming a sub-category, or filing it under
                              a second bike, is the whole point of it being one
                              row instead of two. */}
                          <button
                            type="button"
                            onClick={() => onEditSubCategory(s)}
                            aria-label={`Edit ${s.name}`}
                            className={cn(
                              "inline-flex min-h-9 cursor-pointer items-center rounded-r-full border px-2.5",
                              "transition-[background-color,color] duration-150 ease-out",
                              active
                                ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--sage)] hover:text-[var(--ink-on-dark)]"
                                : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-label)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                            )}
                          >
                            <Pencil size={12} />
                          </button>
                        </span>
                      );
                    })}

                    <button
                      type="button"
                      onClick={onNewSubCategory}
                      className={cn(
                        "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3.5 text-xs font-extrabold",
                        "border-[var(--hairline-strong)] bg-[var(--surface)] text-[var(--ink-muted)]",
                        "transition-[background-color,color] duration-150 ease-out",
                        "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                      )}
                    >
                      <Plus size={14} /> Add sub-category
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCategory(c.id)}
                    className={cn(
                      "flex h-full min-h-[92px] w-full cursor-pointer flex-col justify-between gap-2 rounded-[var(--r-tile)] border p-3 text-left",
                      "border-[var(--hairline)] bg-[var(--surface)]",
                      "transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98]",
                      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-sunk)]",
                      c.isArchived && "opacity-60",
                    )}
                  >
                    <span className="line-clamp-2 text-sm font-extrabold leading-snug text-[var(--ink)]">
                      {c.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge color="gray">
                        {c.partsCount} {c.partsCount === 1 ? "part" : "parts"}
                      </Badge>
                      {c.subCategoryCount > 0 && (
                        <Badge color="slate">
                          <Tags size={11} />
                          {c.subCategoryCount}
                        </Badge>
                      )}
                      {c.isArchived && <Badge color="gray">Archived</Badge>}
                    </span>
                  </button>
                ))}

                {/* Always present, never behind a mode. An empty grid still
                    shows it, so a workshop with no categories yet has the one
                    thing it needs rather than an illustration and a CTA that
                    say the same thing in more space. */}
                <button
                  type="button"
                  onClick={onNewCategory}
                  className={cn(
                    "flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--r-tile)]",
                    "border border-dashed border-[var(--hairline-strong)] bg-[var(--surface)] p-3",
                    "text-[var(--ink-muted)] transition-[background-color,color] duration-150 ease-out",
                    "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] active:scale-[0.98]",
                  )}
                >
                  <Plus size={18} />
                  <span className="text-xs font-extrabold">New category</span>
                </button>
              </div>

              {/* Offered only when there is something archived to show. A
                  toggle that reveals nothing is a control that teaches you to
                  ignore controls. */}
              {(archivedCount > 0 || showArchived) && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={showArchived}
                  onClick={onToggleArchived}
                  className={cn(
                    "cursor-pointer text-xs font-bold underline underline-offset-2",
                    "text-[var(--ink-label)] transition-colors duration-150 ease-out hover:text-[var(--ink)]",
                  )}
                >
                  {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
