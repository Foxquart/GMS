"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowLeftRight, Layers, Tags, ChevronDown } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, ErrorState, SectionHeader, Skeleton } from "@/components/ui";
import { PartsBrowser } from "@/components/parts-browser";
import { CategorySheet } from "@/components/category-sheets";
import { REFERENCE_QUERY } from "@/lib/query-keys";
import { cn } from "@/lib/cn";
import type { Category } from "@/components/inventory-types";

/**
 * When the floor was last restocked from the back room.
 *
 * A one-line answer to "has anyone moved stock lately?", which is the question
 * behind a shop shelf running down while the warehouse is full. Deliberately
 * not period-scoped and deliberately not on the dashboard: it is reassurance
 * about stock, not something to act on today, so it lives where stock
 * questions get asked.
 *
 * Shares the `["transfers"]` cache with /inventory/transfers, so arriving from
 * there paints instantly and this costs no extra request.
 *
 * On error or with no transfers ever recorded it renders nothing. A
 * non-essential fact must not put an alert box above the category grid.
 */
function LastTransfer() {
  const { data: transfers, isPending, isError } = useQuery({
    queryKey: ["transfers"],
    queryFn: () =>
      api<{ rows: any[]; total: number; limit: number }>("/api/inventory/transfers").then(
        (r) => r.rows,
      ),
  });

  if (isPending) return <Skeleton className="h-[3.25rem] rounded-[var(--r-tile)]" />;
  if (isError || !transfers?.length) return null;

  const t = transfers[0];
  const lines = Array.isArray(t.items) ? t.items.length : 0;

  return (
    <Link
      href="/inventory/transfers"
      className={cn(
        "flex min-h-[3.25rem] items-center gap-3 rounded-[var(--r-tile)]",
        "border border-[var(--hairline)] bg-[var(--surface-bright)] px-3.5 py-2.5",
        "transition-colors duration-150 ease-out hover:border-[var(--hairline-strong)]",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="tile-label text-[var(--ink-label)]">Last stock move</p>
        <p className="truncate text-sm font-bold text-[var(--ink)]">
          {lines} part{lines === 1 ? "" : "s"} · {formatDateTime(t.createdAt)}
        </p>
      </div>
      {/* The same badge, with the same colours, as the transfers page itself —
          two screens describing one direction the same way. */}
      <div className="shrink-0">
        <Badge color={t.fromCode === "SHOP" ? "amber" : "blue"}>
          {t.fromName ?? "Warehouse"} → {t.toName ?? "Shop"}
        </Badge>
      </div>
    </Link>
  );
}

/**
 * The inventory hub: pick a category, or search the whole shelf.
 *
 * Opening a category used to happen in place — the grid folded away and the
 * sub-categories appeared where it had been. That kept one route but meant one
 * screen doing two jobs, and with a dozen categories the fold was a big silent
 * jump. Categories now hand off to their own route, so "which category" and
 * "which part" are separate places with a back button between them, and the
 * all-parts browser below stays available for the times you already know the
 * name and do not want to pick a category at all.
 */
export default function InventoryPage() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [catSheet, setCatSheet] = useState(false);

  // Archived categories come back with the rest and are filtered here rather
  // than refetched. Two reasons: toggling the view costs no round trip, and
  // the count is known — so "Show archived" can hide itself when there is
  // nothing archived to show instead of being a control that does nothing.
  const { data: allCategories, isPending, isError, error, refetch } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api<Category[]>("/api/categories", { params: { archived: "1" } }),
    ...REFERENCE_QUERY,
  });

  const archivedCount = (allCategories ?? []).filter((c) => c.isArchived).length;
  const categories = showArchived ? allCategories : allCategories?.filter((c) => !c.isArchived);

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

      <LastTransfer />

      {/* ── Categories ────────────────────────────────────────────────
          Discovery only. A tile navigates; nothing expands, nothing is
          managed here except making a new one. */}
      <section className="rounded-[var(--r-panel)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4">
        <SectionHeader
          className="mb-3.5"
          title={
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-controls="category-panel-body"
              className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            >
              <span className="truncate">Category</span>
              <ChevronDown
                size={15}
                className={cn(
                  "shrink-0 text-[var(--ink-label)] transition-transform duration-150 ease-out",
                  !panelOpen && "-rotate-90",
                )}
              />
            </button>
          }
          icon={<Layers size={16} />}
        />

        {!panelOpen ? (
          <p className="text-xs font-semibold text-[var(--ink-muted)]">
            {allCategories?.length ?? 0} categories. Open one to see its sub-categories.
          </p>
        ) : (
          <div id="category-panel-body" className="space-y-3.5">
            {isPending ? (
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[92px]" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Couldn't load your categories"
                message={errorMessage(error)}
                reference={errorReference(error)}
                onRetry={() => refetch()}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {categories?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => router.push(`/inventory/category/${c.id}`)}
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

                  {/* Always present. An empty grid still shows it, so a
                      workshop with no categories yet has the one thing it
                      needs rather than an illustration and a CTA that say the
                      same thing in more space. */}
                  <button
                    type="button"
                    onClick={() => setCatSheet(true)}
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
                    toggle that reveals nothing is a control that teaches you
                    to ignore controls. */}
                {(archivedCount > 0 || showArchived) && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showArchived}
                    onClick={() => setShowArchived((v) => !v)}
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

      {/* Unscoped, because knowing the part's name is the other way in and it
          should not cost a category guess first. */}
      <PartsBrowser />

      <CategorySheet open={catSheet} onClose={() => setCatSheet(false)} editing={null} />
    </div>
  );
}
