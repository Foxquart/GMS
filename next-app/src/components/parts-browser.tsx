"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  SectionHeader,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotOilCan, SpotTools } from "@/components/illustrations";
import { currency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { STOCK_LOCATIONS, type Part, type StockLocationCode } from "@/components/inventory-types";

/** Health of one location's balance, in the colour language of the system. */
function health(stock: number, min: number) {
  if (stock <= 0) return "out" as const;
  if (stock < min) return "low" as const;
  return "ok" as const;
}

/**
 * How the list is ordered. Name is the default because a counter hand looking
 * for a part knows what it is called; the rest are for restocking decisions.
 * All four are applied in the database — sorting a page on the client would
 * only order the rows that page happened to contain.
 */
const SORTS = [
  { value: "NAME", label: "Name A–Z" },
  { value: "PRICE_ASC", label: "Price low to high" },
  { value: "PRICE_DESC", label: "Price high to low" },
  { value: "SHOP_ASC", label: "Shop stock: low first" },
  { value: "WAREHOUSE_ASC", label: "Warehouse stock: low first" },
] as const;

type SortId = (typeof SORTS)[number]["value"];

type PartsPage = {
  rows: Part[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

type StockTotals = {
  shop: { units: number; belowMin: number };
  warehouse: { units: number; belowMin: number };
};

/**
 * Search, sort, the two location tiles, the card grid and the pager —
 * everything below the point where the two inventory screens stop differing.
 *
 * `/inventory` mounts it unscoped; the category route mounts it scoped to one
 * category and, when a chip is picked, one sub-category. It owns its queries,
 * so a page only says *what* it is listing.
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
  // Null means "not filtering to shortfalls".
  const [belowMinAt, setBelowMinAt] = useState<StockLocationCode | null>(null);
  const [sort, setSort] = useState<SortId>("NAME");

  /**
   * Which location the screen is currently reading through, derived from the
   * sort rather than held as its own flag.
   *
   * Two separate pieces of state meant the tile you had selected and the
   * location actually being sorted by could drift apart. One value cannot
   * disagree with itself, and it also means the tiles and the Sort dropdown
   * are visibly the same control — tapping a tile moves the dropdown.
   */
  const viewing: StockLocationCode | null =
    sort === "SHOP_ASC" ? "SHOP" : sort === "WAREHOUSE_ASC" ? "WAREHOUSE" : null;

  const selectLocation = (code: StockLocationCode) => {
    setSort(viewing === code ? "NAME" : code === "SHOP" ? "SHOP_ASC" : "WAREHOUSE_ASC");
    setPage(1);
  };
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // The list filters itself as you type; a separate Search button was a second
  // thing to hit for a result the field can deliver on its own.
  //
  // Any change to what is being listed puts you back on page one — staying on
  // page 7 of a list that just became two pages long is how people end up
  // staring at nothing. Each input resets it where the change happens rather
  // than in a watching effect, which would rerender twice for every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // The scope arrives as props — picking a sub-category changes it without
  // remounting — so it is reconciled during render, the one place React
  // sanctions adjusting state in response to a prop it cannot intercept.
  const scopeKey = `${categoryId ?? ""}|${subCategoryId ?? ""}`;
  const [lastScope, setLastScope] = useState(scopeKey);
  if (scopeKey !== lastScope) {
    setLastScope(scopeKey);
    setPage(1);
  }

  const scope = {
    categoryId: categoryId || undefined,
    subCategoryId: subCategoryId || undefined,
    q: search || undefined,
  };

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "inventory",
      categoryId ?? "",
      subCategoryId ?? "",
      search,
      sort,
      belowMinAt ?? "",
      page,
    ],
    queryFn: () =>
      api<PartsPage>("/api/parts", {
        params: {
          ...scope,
          sort,
          location: belowMinAt ?? undefined,
          stock: belowMinAt ? "BELOW" : undefined,
          page: String(page),
        },
      }),
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash the whole grid away and back.
    placeholderData: keepPreviousData,
  });

  // Totals come from the database over the whole catalogue. Summing the page
  // in hand would under-report the moment there is more than one page — and a
  // stock figure that lies is worse than no figure.
  const { data: totals } = useQuery({
    queryKey: ["inventory", "totals", categoryId ?? "", subCategoryId ?? "", search],
    queryFn: () => api<StockTotals>("/api/inventory/totals", { params: scope }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;
  const currentPage = data?.page ?? page;

  return (
    <>
      {/* ── Where the stock is ───────────────────────────────────────
          Both locations, always on screen, never behind a control — seeing the
          units costs zero taps.

          Two targets per tile, and they are siblings rather than nested,
          because a button cannot live inside a button:

            the tile   → read the list through this location (sorts by its
                         stock, lowest first, and lights up its half of every
                         card). Always available, whatever the numbers say.
            "N below
             minimum"  → filter to just those, and only rendered when there is
                         at least one. This is the part that used to be the
                         whole tile, which meant a location reading "All above
                         minimum" still invited a tap that could only ever land
                         on an empty list. */}
      <div className="grid grid-cols-2 gap-2.5">
        {STOCK_LOCATIONS.map((loc) => {
          const figures = totals?.[loc.code === "SHOP" ? "shop" : "warehouse"];
          const short = figures?.belowMin ?? 0;
          const filtering = belowMinAt === loc.code;
          const active = viewing === loc.code || filtering;

          return (
            <div key={loc.code} className="relative">
              <button
                type="button"
                onClick={() => selectLocation(loc.code)}
                aria-pressed={viewing === loc.code}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 rounded-[var(--r-tile)] border p-3 text-left",
                  "transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98]",
                  active
                    ? "border-[var(--forest)] bg-[var(--sage)]"
                    : "border-[var(--hairline)] bg-[var(--surface-bright)] hover:bg-[var(--surface)]",
                  // Room for the shortfall link layered over the bottom.
                  short > 0 && "pb-7",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-extrabold",
                    active ? "text-[var(--forest)]" : "text-[var(--ink)]",
                  )}
                >
                  <loc.icon size={14} aria-hidden />
                  {loc.label}
                </span>
                <span className="flex items-baseline gap-1">
                  <span className="numeral text-2xl leading-none text-[var(--ink)]">
                    {totals ? figures?.units.toLocaleString("en-IN") : "—"}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--ink-muted)]">units</span>
                </span>
                {/* Colour is never the only channel — the word says it too. */}
                {short === 0 && (
                  <span className="text-[11px] font-bold text-[var(--ink-label)]">
                    All above minimum
                  </span>
                )}
              </button>

              {short > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBelowMinAt(filtering ? null : loc.code);
                    setPage(1);
                  }}
                  aria-pressed={filtering}
                  className={cn(
                    "absolute inset-x-3 bottom-2.5 cursor-pointer text-left text-[11px] font-bold",
                    "underline underline-offset-2 transition-colors duration-150 ease-out",
                    filtering
                      ? "text-[var(--forest)]"
                      : "text-[var(--terracotta-hover)] hover:text-[var(--terracotta)]",
                  )}
                >
                  {filtering ? `Showing ${short} below min` : `${short} below minimum`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <StickyControls className="space-y-2.5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, part number"
            aria-label="Search parts"
            className="pl-11 pr-11"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
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
                {total.toLocaleString("en-IN")} {total === 1 ? "part" : "parts"}
                {belowMinAt ? (
                  <span className="font-semibold text-[var(--ink-muted)]">
                    {" "}
                    below minimum in the {belowMinAt === "SHOP" ? "shop" : "warehouse"}
                  </span>
                ) : (
                  viewing && (
                    <span className="font-semibold text-[var(--ink-muted)]">
                      {" "}
                      · lowest {viewing === "SHOP" ? "shop" : "warehouse"} stock first
                    </span>
                  )
                )}
              </>
            )}
          </p>

          <AnimatedDropdown
            className="w-[8.5rem] shrink-0"
            options={SORTS.map((o) => ({ id: o.value, name: o.label }))}
            value={sort}
            onChange={(v: string) => {
              setSort((v || "NAME") as SortId);
              setPage(1);
            }}
            placeholder="Sort"
          />
        </div>
      </StickyControls>

      <section>
        <SectionHeader title={search ? `Results for “${search}”` : (heading ?? "All parts")} />

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
              search
                ? "No parts match that search"
                : belowMinAt
                  ? "Nothing is below its minimum here"
                  : (emptyTitle ?? "The shelves are empty")
            }
            description={
              search
                ? "Try a shorter search — part numbers and brands are matched too."
                : belowMinAt
                  ? "Every part is at or above the level you set for this location."
                  : (emptyDescription ??
                    "Add your first part and its shop and warehouse levels will be tracked from here.")
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setQ("")}>
                  Clear search
                </Button>
              ) : belowMinAt ? (
                <Button variant="outline" onClick={() => setBelowMinAt(null)}>
                  Show all parts
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
        ) : (
          <>
            <ul
              className={cn(
                "grid grid-cols-2 gap-2.5 sm:grid-cols-3",
                isFetching && !isPending && "opacity-70",
              )}
            >
              {rows.map((p) => (
                <li key={p.id}>
                  <PartCard part={p} viewing={viewing} />
                </li>
              ))}
            </ul>

            <Pager page={currentPage} pageCount={pageCount} onGo={setPage} />
          </>
        )}
      </section>
    </>
  );
}

/**
 * One part.
 *
 * The block at the top used to be a single tinted plate standing in for a
 * product photo the schema does not have — 72px of decoration on every card.
 * It is now the two stock figures, split down the middle, each side coloured
 * by its own health. That is the separation the screen is for: `35 | 0` reads
 * as "plenty in the shop, nothing in the back" in one glance, without tapping
 * anything or switching a lens.
 *
 * `viewing` never hides the other half — both figures stay legible whatever is
 * selected. It only underlines the side you asked to read through, so the tile
 * you tapped has a visible consequence down here.
 */
function PartCard({ part: p, viewing }: { part: Part; viewing: StockLocationCode | null }) {
  const shop = Number(p.shopStock ?? 0);
  const warehouse = Number(p.warehouseStock ?? 0);

  return (
    <Link
      href={`/inventory/parts/${p.id}`}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)]",
        "transition-[background-color,border-color,transform] duration-150 ease-out",
        "hover:border-[var(--hairline-strong)] active:scale-[0.985]",
      )}
    >
      <span className="flex divide-x divide-[var(--surface-bright)]">
        <StockHalf
          label="Shop"
          value={shop}
          state={health(shop, Number(p.minimumShopStock ?? 0))}
          reading={viewing === "SHOP"}
        />
        <StockHalf
          label="Warehouse"
          value={warehouse}
          state={health(warehouse, Number(p.minimumWarehouseStock ?? 0))}
          reading={viewing === "WAREHOUSE"}
        />
      </span>

      <span className="flex flex-1 flex-col gap-1 p-2.5">
        <span className="line-clamp-2 text-xs font-extrabold leading-snug text-[var(--ink)]">
          {p.name}
        </span>
        <span className="truncate text-[11px] font-semibold text-[var(--ink-muted)]">
          {p.partNumber || "No part number"}
          {p.brand ? ` · ${p.brand}` : ""}
        </span>
        <span className="tabular mt-auto pt-1 text-sm font-extrabold text-[var(--ink)]">
          {currency(p.sellingPrice)}
        </span>
      </span>
    </Link>
  );
}

/** One side of the split stock block. */
function StockHalf({
  label,
  value,
  state,
  reading,
}: {
  label: string;
  value: number;
  state: ReturnType<typeof health>;
  /** This is the location the list is currently being read through. */
  reading: boolean;
}) {
  return (
    <span
      // Meaningful without other visible text, so it names itself rather than
      // leaving a screen reader to infer "35" belongs to the shop.
      role="img"
      aria-label={`${label}: ${value} ${state === "out" ? "(empty)" : state === "low" ? "(below minimum)" : ""}`}
      className={cn(
        "relative flex flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-3",
        state === "out" && "bg-[var(--terracotta)] text-[#fdf6f2]",
        state === "low" && "bg-[var(--ochre)] text-[var(--forest-deep)]",
        state === "ok" && "bg-[var(--sage)] text-[var(--forest)]",
      )}
    >
      <span aria-hidden className={cn("numeral leading-none", reading ? "text-2xl" : "text-xl")}>
        {value}
      </span>
      <span
        aria-hidden
        className={cn(
          "text-[9px] font-extrabold uppercase tracking-[0.08em]",
          reading ? "opacity-100" : "opacity-70",
        )}
      >
        {label}
      </span>
      {/* A rule under the side being read, so the tile you tapped has a
          consequence you can see on every row — not just a highlighted tile. */}
      {reading && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-current opacity-45" />
      )}
    </span>
  );
}

/**
 * Numbered pages, kept to one row on a phone.
 *
 * A workshop with 2,000 parts has 84 pages; printing all of them would wrap
 * across half the screen. This shows the first, the last, the current and its
 * neighbours, with ellipses for the gaps — so the row is a fixed width
 * whatever the catalogue size.
 */
function Pager({
  page,
  pageCount,
  onGo,
}: {
  page: number;
  pageCount: number;
  onGo: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const numbers: (number | "gap")[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) numbers.push(n);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }

  const step =
    "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-extrabold " +
    "transition-[background-color,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav
      aria-label="Parts pages"
      className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onGo(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(step, "bg-[var(--surface-sunk)] text-[var(--ink)] hover:bg-[var(--hairline)]")}
      >
        <ChevronLeft size={16} />
      </button>

      {numbers.map((n, i) =>
        n === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="px-1 text-xs font-bold text-[var(--ink-label)]"
          >
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onGo(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              step,
              n === page
                ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                : "bg-[var(--surface-sunk)] text-[var(--ink-muted)] hover:bg-[var(--hairline)] hover:text-[var(--ink)]",
            )}
          >
            {n}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onGo(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={cn(step, "bg-[var(--surface-sunk)] text-[var(--ink)] hover:bg-[var(--hairline)]")}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
