"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Tags } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { Badge, CircleButton, ErrorState, Skeleton } from "@/components/ui";
import { PartsBrowser } from "@/components/parts-browser";
import { CategorySheet, SubCategorySheet } from "@/components/category-sheets";
import { REFERENCE_QUERY } from "@/lib/query-keys";
import { cn } from "@/lib/cn";
import type { Category, SubCategory } from "@/components/inventory-types";

export default function CategoryPage() {
  // useSearchParams() must sit inside a Suspense boundary (App Router).
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryBrowser />
    </Suspense>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-[5.5rem] rounded-[var(--r-panel)]" />
      <Skeleton className="h-11 rounded-[var(--r-control)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[11.5rem]" />
        ))}
      </div>
    </div>
  );
}

/**
 * One category: its sub-categories, and the parts inside it.
 *
 * The sub-category choice lives in the URL rather than in state so a narrowed
 * shelf can be linked to and survives a refresh — the same contract the
 * combined screen had before this became its own route.
 */
function CategoryBrowser() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subCategoryId = searchParams.get("sub") ?? "";

  const [catSheet, setCatSheet] = useState(false);
  const [subSheet, setSubSheet] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);

  const selectSub = (next: string) => {
    router.replace(
      next ? `/inventory/category/${id}?sub=${next}` : `/inventory/category/${id}`,
      { scroll: false },
    );
  };

  const {
    data: category,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["category", id],
    queryFn: () => api<Category>(`/api/categories/${id}`),
    ...REFERENCE_QUERY,
  });

  const subCategoriesQuery = useQuery({
    queryKey: ["subcategories", id],
    queryFn: () => api<SubCategory[]>("/api/subcategories", { params: { categoryId: id } }),
    ...REFERENCE_QUERY,
  });
  const subCategories = subCategoriesQuery.data;

  // The sheet needs every category, not just this one — filing "Back lamp"
  // under Pulsar as well is the whole point of the many-to-many.
  const { data: allCategories } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api<Category[]>("/api/categories", { params: { archived: "1" } }),
    ...REFERENCE_QUERY,
  });

  const selectedSub = (subCategories ?? []).find((s) => s.id === subCategoryId);

  // A stale `?sub=` — deleted, or unlinked from this category — would leave an
  // empty parts grid with no visible reason, so it is dropped once the real
  // list has landed. In an effect, not in render: this navigates.
  useEffect(() => {
    if (subCategoryId && subCategories && !subCategories.some((s) => s.id === subCategoryId)) {
      router.replace(`/inventory/category/${id}`, { scroll: false });
    }
  }, [subCategoryId, subCategories, router, id]);

  if (isPending) return <CategorySkeleton />;

  if (isError || !category) {
    return (
      <div className="space-y-5">
        <BackLink />
        <ErrorState
          title="Couldn't load this category"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CircleButton
          onDark={false}
          onClick={() => router.push("/inventory")}
          aria-label="Back to inventory"
        >
          <ArrowLeft size={18} />
        </CircleButton>
        <div className="min-w-0 flex-1">
          <p className="tile-label text-[var(--ink-label)]">Inventory</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
            <span className="truncate">{category.name}</span>
            {category.isArchived && <Badge color="gray">Archived</Badge>}
          </h1>
          {category.description && (
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ink-muted)]">
              {category.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCatSheet(true)}
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold",
            "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
            "transition-[background-color,color] duration-150 ease-out",
            "hover:bg-[var(--hairline)] hover:text-[var(--ink)]",
          )}
        >
          <Pencil size={12} /> Edit
        </button>
      </div>

      {/* ── Sub-categories ───────────────────────────────────────────
          The row is the filter for the grid below it. "All" is the first chip
          rather than a Clear link off to the side: sitting in the row it reads
          as the state the list is in, which is what it is. */}
      <section className="rounded-[var(--r-panel)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4">
        <p className="tile-label mb-2.5 flex items-center gap-1.5 text-[var(--ink-label)]">
          <Tags size={13} />
          Sub-categories
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
            <button
              type="button"
              onClick={() => selectSub("")}
              aria-pressed={!subCategoryId}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-xs font-extrabold",
                "transition-[background-color,border-color,color] duration-150 ease-out",
                !subCategoryId
                  ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                  : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-sunk)]",
              )}
            >
              All
            </button>

            {subCategories?.map((s) => {
              const active = s.id === subCategoryId;
              // A sub-category shared with other categories is the normal case
              // here, and worth saying — it is why editing one shows up
              // everywhere it is filed.
              const shared = s.categories.length > 1;
              return (
                <span key={s.id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => selectSub(active ? "" : s.id)}
                    aria-pressed={active}
                    title={
                      shared
                        ? `Also in ${s.categories
                            .filter((c) => c.id !== id)
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
                  {/* Welded to the chip: renaming a sub-category, or filing it
                      under a second bike, is the whole point of it being one
                      row instead of two. */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSub(s);
                      setSubSheet(true);
                    }}
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
              onClick={() => {
                setEditingSub(null);
                setSubSheet(true);
              }}
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
      </section>

      <PartsBrowser
        categoryId={id}
        subCategoryId={subCategoryId || undefined}
        heading={selectedSub ? selectedSub.name : category.name}
        emptyTitle={
          selectedSub
            ? `Nothing is filed under ${selectedSub.name} yet`
            : `Nothing is filed under ${category.name} yet`
        }
        emptyDescription="Add a part here, or go back and pick a different category."
      />

      <CategorySheet
        open={catSheet}
        onClose={() => setCatSheet(false)}
        editing={category}
        // Deleting the category you are standing in leaves nowhere to stand.
        onGone={() => router.push("/inventory")}
      />
      <SubCategorySheet
        open={subSheet}
        onClose={() => setSubSheet(false)}
        editing={editingSub}
        defaultCategoryId={id}
        categories={allCategories}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/inventory"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)]"
    >
      <ArrowLeft size={14} /> Back to inventory
    </Link>
  );
}
