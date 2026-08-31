"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package, Search, Plus, X, Store, Warehouse, Check, SlidersHorizontal } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotOilCan, SpotTools } from "@/components/illustrations";
import { currency } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Part } from "@/components/inventory-types";

type LocationCode = "SHOP" | "WAREHOUSE";

/** `label` is the full spoken name — the filter sheet is where it is read. */
const LOCATIONS: { value: LocationCode; label: string; icon: typeof Store }[] = [
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

const STATUS_FILTERS = [
  { value: "ALL", label: "All parts" },
  { value: "LOW", label: "Low stock" },
  { value: "OUT", label: "Out of stock" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

/**
 * How the grid is ordered. Name is the default because a counter hand looking
 * for a part knows what it is called; the rest are for restocking decisions.
 */
const SORTS = [
  { value: "NAME", label: "Name A–Z" },
  { value: "PRICE_ASC", label: "Price low to high" },
  { value: "PRICE_DESC", label: "Price high to low" },
  { value: "STOCK_ASC", label: "Stock low to high" },
] as const;

type SortId = (typeof SORTS)[number]["value"];

/**
 * Search, filter, sort and the card grid — everything below the point where
 * the two inventory screens stop differing.
 *
 * `/inventory` mounts it unscoped to browse the whole shelf; the category
 * route mounts it scoped to one category and, when a chip is picked, one
 * sub-category. It owns its own query, so a page only has to say *what* it is
 * listing, never how to fetch or lay it out.
 */
export function PartsBrowser({
  categoryId,
  subCategoryId,
  heading,
  emptyTitle,
  emptyDescription,
}: {
  categoryId?: string;
  subCategoryId?: string;
  /** Overrides the derived title — the category route names itself. */
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [tab, setTab] = useState<LocationCode>("SHOP");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortId>("NAME");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: parts, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["inventory", search, categoryId ?? "", subCategoryId ?? ""],
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

  const stockFor = (p: Part) => Number((tab === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0);
  const minFor = (p: Part) =>
    Number((tab === "SHOP" ? p.minimumShopStock : p.minimumWarehouseStock) ?? 0);

  const rows = parts ?? [];
  const totalParts = rows.length;
  const lowCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "low").length;
  const outCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "out").length;
  const unitsIn = (loc: LocationCode) =>
    rows.reduce((sum, p) => sum + Number((loc === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0), 0);
  const here = tab === "SHOP" ? "shop" : "warehouse";

  const statusCount = (value: StatusFilter) =>
    value === "ALL" ? totalParts : value === "LOW" ? lowCount : outCount;

  // Filtering and sorting both happen on the list already in hand — changing
  // either must not cost a round trip.
  const visible = rows
    .filter((p) => {
      if (status === "ALL") return true;
      const h = health(stockFor(p), minFor(p));
      return status === "LOW" ? h === "low" : h === "out";
    })
    // `.sort` mutates, so this runs on the array `.filter` just produced —
    // never on `parts`, which react-query owns and hands to every other reader.
    .sort((a, b) => {
      if (sort === "PRICE_ASC") return Number(a.sellingPrice ?? 0) - Number(b.sellingPrice ?? 0);
      if (sort === "PRICE_DESC") return Number(b.sellingPrice ?? 0) - Number(a.sellingPrice ?? 0);
      if (sort === "STOCK_ASC") return stockFor(a) - stockFor(b);
      return a.name.localeCompare(b.name);
    });

  // Search is always visible, so it is not counted here — this is the badge on
  // the Filter button, and it should only speak for what the sheet hides.
  const activeFilters = (status === "ALL" ? 0 : 1) + (tab === "SHOP" ? 0 : 1);

  return (
    <>
      {/* Search stays on the surface because it is the control people reach
          for constantly; where the stock sits and what condition it is in go
          behind Filter, which is the pair you set once and leave. */}
      <StickyControls className="space-y-2.5">
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

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-extrabold text-[var(--ink)]">
            {isFetching && !isPending ? (
              <span className="text-[var(--ink-muted)]">Updating…</span>
            ) : (
              <>
                {visible.length} {visible.length === 1 ? "part" : "parts"}
                {tab === "WAREHOUSE" && (
                  <span className="font-semibold text-[var(--ink-muted)]"> · warehouse</span>
                )}
              </>
            )}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold",
                "transition-[background-color,border-color,color] duration-150 ease-out",
                activeFilters
                  ? "border-[var(--forest)] bg-[var(--sage)] text-[var(--forest)]"
                  : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]",
              )}
            >
              <SlidersHorizontal size={13} />
              Filter
              {activeFilters > 0 && (
                <span className="numeral rounded-full bg-[var(--forest)] px-1.5 text-[10px] leading-[1.35] text-[var(--ink-on-dark)]">
                  {activeFilters}
                </span>
              )}
            </button>

            <AnimatedDropdown
              className="w-[8.5rem]"
              options={SORTS.map((o) => ({ id: o.value, name: o.label }))}
              value={sort}
              onChange={(v: string) => setSort((v || "NAME") as SortId)}
              placeholder="Sort"
            />
          </div>
        </div>
      </StickyControls>

      <section>
        <SectionHeader
          title={
            search
              ? `Results for “${search}”`
              : (heading ??
                (status === "LOW"
                  ? `Low in the ${here}`
                  : status === "OUT"
                    ? `Out in the ${here}`
                    : "All parts"))
          }
        />

        {isPending ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[11.5rem]" />
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
              search ? "No parts match that search" : (emptyTitle ?? "The shelves are empty")
            }
            description={
              search
                ? "Try a shorter search — part numbers and brands are matched too."
                : (emptyDescription ??
                  "Add your first part and its shop and warehouse levels will be tracked from here.")
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
            title={
              status === "LOW" ? `Nothing is low in the ${here}` : `Nothing is out in the ${here}`
            }
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
          /* Two-up cards rather than full-width rows. The plate at the top of
             each is where a product photo would go — parts carry no image in
             the schema, so it is tinted by the stock health of whichever
             location is selected, which makes the grid scannable for the thing
             the counter is actually asking.

             The Shop / W/h pair stays on the card. A price alone does not
             answer "have I got one, and is it here or in the back", and that
             is the question this screen exists to answer. */
          <ul
            className={cn(
              "grid grid-cols-2 gap-2.5 sm:grid-cols-3",
              isFetching && !isPending && "opacity-70",
            )}
          >
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
                      "flex h-full flex-col overflow-hidden rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)]",
                      "transition-[background-color,border-color,transform] duration-150 ease-out",
                      "hover:border-[var(--hairline-strong)] active:scale-[0.985]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-[72px] items-center justify-center",
                        activeHealth === "out" && "bg-[var(--terracotta)] text-[#fdf6f2]",
                        activeHealth === "low" && "bg-[var(--ochre)] text-[var(--forest-deep)]",
                        activeHealth === "ok" && "bg-[var(--sage)] text-[var(--forest)]",
                      )}
                    >
                      <Package size={26} />
                    </span>

                    <span className="flex flex-1 flex-col gap-1.5 p-2.5">
                      <span className="line-clamp-2 text-xs font-extrabold leading-snug text-[var(--ink)]">
                        {p.name}
                      </span>
                      <span className="truncate text-[11px] font-semibold text-[var(--ink-muted)]">
                        {p.partNumber || "No part number"}
                        {p.brand ? ` · ${p.brand}` : ""}
                      </span>

                      {/* Pushed to the bottom so price and stock line up
                          across a row of cards with different name lengths. */}
                      <span className="mt-auto flex flex-col gap-1.5 pt-0.5">
                        <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                          {currency(p.sellingPrice)}
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          <Badge color={tab === "SHOP" ? healthColor(shopHealth) : "gray"}>
                            Shop {shop}
                          </Badge>
                          <Badge color={tab === "WAREHOUSE" ? healthColor(whHealth) : "gray"}>
                            W/h {warehouse}
                          </Badge>
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Filter sheet ───────────────────────────────────────────
          Where the stock sits and what condition it is in. They are set once
          and left, so they cost a tap to reach and nothing to ignore. The unit
          totals ride on the location options, which is where they were
          readable when this was a permanent bar. */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter parts">
        <div className="space-y-5">
          <Field label="Stock location">
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((loc) => {
                const active = tab === loc.value;
                return (
                  <button
                    key={loc.value}
                    type="button"
                    onClick={() => setTab(loc.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-1 rounded-[var(--r-tile)] border p-3 text-left",
                      "transition-[background-color,border-color] duration-150 ease-out",
                      active
                        ? "border-[var(--forest)] bg-[var(--sage)]"
                        : "border-[var(--hairline)] bg-[var(--surface)] hover:bg-[var(--surface-sunk)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-extrabold",
                        active ? "text-[var(--forest)]" : "text-[var(--ink)]",
                      )}
                    >
                      <loc.icon size={14} />
                      {loc.label}
                    </span>
                    <span className="numeral text-lg leading-none text-[var(--ink)]">
                      {unitsIn(loc.value)}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--ink-muted)]">units</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Stock level">
            <div className="space-y-1.5">
              {STATUS_FILTERS.map((f) => {
                const active = status === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatus(f.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--r-tile)] px-3 py-2.5 text-left",
                      "transition-[background-color] duration-150 ease-out",
                      active ? "bg-[var(--sage)]" : "hover:bg-[var(--surface-sunk)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                          : "border-[var(--hairline-strong)] bg-[var(--surface-bright)]",
                      )}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-xs font-extrabold",
                        active ? "text-[var(--forest)]" : "text-[var(--ink)]",
                      )}
                    >
                      {f.label}
                    </span>
                    <Badge color={active ? "green" : "gray"}>{statusCount(f.value)}</Badge>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!activeFilters}
              onClick={() => {
                setTab("SHOP");
                setStatus("ALL");
              }}
            >
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setFilterOpen(false)}>
              Show {visible.length} {visible.length === 1 ? "part" : "parts"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
